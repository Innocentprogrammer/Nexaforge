from ipaddress import ip_address as parse_ip
import csv
from datetime import timedelta

from django.db.models.functions import TruncDate, TruncMonth
from django.http import HttpResponse
from django.utils.dateparse import parse_date

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, mixins, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from guests.models import Guest
from invitations.models import Invitation
from leads.models import Lead
from notifications.models import Notification
from products.models import Product
from rsvp.models import RSVP
from subscriptions.models import Payment, Subscription
from templates_app.models import InvitationTemplate

from .models import AdminActivityLog
from .permissions import IsNexaStaff
from .serializers import (
    AdminInvitationSerializer, AdminLeadSerializer, AdminNotificationSerializer,
    AdminPaymentSerializer, AdminProductSerializer, AdminSubscriptionSerializer,
    AdminTemplateSerializer, AdminUserSerializer,
)


class AdminPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


def _record(request, action, target_type, target_id="", summary="", metadata=None):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
    raw_ip = forwarded or request.META.get("REMOTE_ADDR")
    try:
        ip = str(parse_ip(raw_ip)) if raw_ip else None
    except ValueError:
        ip = None
    AdminActivityLog.objects.create(
        actor=request.user,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        summary=summary or action,
        metadata=metadata or {},
        ip_address=ip,
    )


class AdminDashboardView(APIView):
    permission_classes = [IsNexaStaff]

    def get(self, request):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        captured = Payment.objects.filter(status=Payment.Status.CAPTURED)
        monthly_revenue = captured.filter(updated_at__gte=month_start).aggregate(total=Sum("amount"))["total"] or 0
        total_revenue = captured.aggregate(total=Sum("amount"))["total"] or 0
        active_subscriptions = Subscription.objects.filter(status=Subscription.Status.ACTIVE, ends_at__gt=now).count()
        recent_users = User.objects.order_by("-created_at").values("id", "email", "full_name", "created_at")[:8]
        recent_activity = AdminActivityLog.objects.select_related("actor").all()[:10]
        return Response({
            "success": True,
            "data": {
                "kpis": {
                    "total_users": User.objects.count(),
                    "active_users": User.objects.filter(is_active=True).count(),
                    "total_invitations": Invitation.objects.filter(deleted_at__isnull=True).count(),
                    "published_invitations": Invitation.objects.filter(status=Invitation.Status.PUBLISHED, deleted_at__isnull=True).count(),
                    "total_guests": Guest.objects.count(),
                    "total_templates": InvitationTemplate.objects.count(),
                    "active_templates": InvitationTemplate.objects.filter(active=True).count(),
                    "total_products": Product.objects.count(),
                    "active_products": Product.objects.filter(active=True).count(),
                    "total_rsvps": RSVP.objects.count(),
                    "active_subscriptions": active_subscriptions,
                    "monthly_revenue_paise": monthly_revenue,
                    "total_revenue_paise": total_revenue,
                    "total_leads": Lead.objects.count(),
                    "unread_notifications": Notification.objects.filter(is_read=False).count(),
                    "failed_notification_emails": Notification.objects.filter(email_status=Notification.EmailStatus.FAILED).count(),
                },
                "recent_users": list(recent_users),
                "recent_activity": [
                    {"id": str(row.id), "actor": row.actor.email if row.actor else "System", "action": row.action, "summary": row.summary, "created_at": row.created_at}
                    for row in recent_activity
                ],
            },
        })


class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsNexaStaff]
    serializer_class = AdminUserSerializer
    pagination_class = AdminPagination

    def get_queryset(self):
        qs = User.objects.annotate(invitation_count=Count("invitations", filter=Q(invitations__deleted_at__isnull=True), distinct=True)).order_by("-created_at")
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(full_name__icontains=search) | Q(phone__icontains=search))
        active = self.request.query_params.get("active")
        if active in ("true", "false"):
            qs = qs.filter(is_active=(active == "true"))
        return qs


class AdminUserDetailView(APIView):
    permission_classes = [IsNexaStaff]

    def patch(self, request, user_id):
        target = get_object_or_404(User, pk=user_id)
        if target.is_superuser and not request.user.is_superuser:
            return Response({"success": False, "message": "Only a superuser can modify another superuser."}, status=status.HTTP_403_FORBIDDEN)
        allowed = {"is_active", "is_verified", "role", "is_staff"}
        unknown = set(request.data.keys()) - allowed
        if unknown:
            return Response({"success": False, "message": f"Unsupported fields: {', '.join(sorted(unknown))}"}, status=status.HTTP_400_BAD_REQUEST)
        if "is_active" in request.data and not isinstance(request.data["is_active"], bool):
            return Response({"success": False, "message": "is_active must be a boolean."}, status=status.HTTP_400_BAD_REQUEST)
        if "is_verified" in request.data and not isinstance(request.data["is_verified"], bool):
            return Response({"success": False, "message": "is_verified must be a boolean."}, status=status.HTTP_400_BAD_REQUEST)
        if "is_staff" in request.data and not request.user.is_superuser:
            return Response({"success": False, "message": "Only a superuser can grant or revoke staff access."}, status=status.HTTP_403_FORBIDDEN)
        if "role" in request.data and request.data["role"] not in User.Role.values:
            return Response({"success": False, "message": "Invalid user role."}, status=status.HTTP_400_BAD_REQUEST)
        if target.pk == request.user.pk and request.data.get("is_active") is False:
            return Response({"success": False, "message": "You cannot deactivate your own account."}, status=status.HTTP_400_BAD_REQUEST)
        if target.pk == request.user.pk and request.data.get("is_staff") is False:
            return Response({"success": False, "message": "You cannot revoke your own staff access."}, status=status.HTTP_400_BAD_REQUEST)
        changes = {}
        for field in allowed.intersection(request.data.keys()):
            value = request.data[field]
            old_value = getattr(target, field)
            if old_value != value:
                setattr(target, field, value)
                changes[field] = {"from": old_value, "to": value}
        if changes:
            target.save(update_fields=[*changes.keys(), "updated_at"])
            _record(request, "USER_UPDATED", "User", target.pk, f"Updated account {target.email}", changes)
        return Response({"success": True, "data": AdminUserSerializer(target).data})


class AdminInvitationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsNexaStaff]
    serializer_class = AdminInvitationSerializer
    pagination_class = AdminPagination

    def get_queryset(self):
        qs = Invitation.objects.select_related("user", "template").annotate(guest_count=Count("guests", distinct=True), rsvp_count=Count("rsvps", distinct=True)).order_by("-created_at")
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(slug__icontains=search) | Q(user__email__icontains=search))
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        return qs

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        invitation = self.get_object()
        new_status = request.data.get("status")
        if new_status not in Invitation.Status.values:
            return Response({"success": False, "message": "A valid invitation status is required."}, status=status.HTTP_400_BAD_REQUEST)
        old_status = invitation.status
        invitation.status = new_status
        if new_status == Invitation.Status.PUBLISHED and not invitation.qr_code:
            invitation.qr_code = f"/i/{invitation.slug}"
        invitation.save(update_fields=["status", "qr_code", "updated_at"])
        _record(request, "INVITATION_STATUS_CHANGED", "Invitation", invitation.pk, f"Changed {invitation.title} from {old_status} to {new_status}", {"from": old_status, "to": new_status})
        return Response({"success": True, "data": self.get_serializer(invitation).data})


class AdminTemplateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsNexaStaff]
    serializer_class = AdminTemplateSerializer
    pagination_class = AdminPagination
    queryset = InvitationTemplate.objects.all().order_by("-created_at")

    def get_queryset(self):
        qs = InvitationTemplate.objects.all().order_by("-created_at")
        search = self.request.query_params.get("search", "").strip()
        return qs.filter(name__icontains=search) if search else qs

    def perform_create(self, serializer):
        obj = serializer.save()
        _record(self.request, "TEMPLATE_CREATED", "InvitationTemplate", obj.pk, f"Created template {obj.name}")

    def perform_update(self, serializer):
        obj = serializer.save()
        _record(self.request, "TEMPLATE_UPDATED", "InvitationTemplate", obj.pk, f"Updated template {obj.name}")

    def perform_destroy(self, instance):
        # Preserve catalogue history even when no current invitation references it.
        name, pk = instance.name, instance.pk
        instance.active = False
        instance.save(update_fields=["active"])
        _record(self.request, "TEMPLATE_DEACTIVATED", "InvitationTemplate", pk, f"Deactivated template {name}; catalogue record retained")


class AdminProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsNexaStaff]
    serializer_class = AdminProductSerializer
    pagination_class = AdminPagination
    queryset = Product.objects.all().order_by("order", "name")

    def get_queryset(self):
        qs = Product.objects.all().order_by("order", "name")
        search = self.request.query_params.get("search", "").strip()
        return qs.filter(Q(name__icontains=search) | Q(slug__icontains=search)) if search else qs

    def perform_create(self, serializer):
        obj = serializer.save()
        _record(self.request, "PRODUCT_CREATED", "Product", obj.pk, f"Created product {obj.name}")

    def perform_update(self, serializer):
        obj = serializer.save()
        _record(self.request, "PRODUCT_UPDATED", "Product", obj.pk, f"Updated product {obj.name}")

    def perform_destroy(self, instance):
        name, pk = instance.name, instance.pk
        instance.active = False
        instance.save(update_fields=["active"])
        _record(self.request, "PRODUCT_DEACTIVATED", "Product", pk, f"Deactivated product {name}")


class AdminPaymentListView(generics.ListAPIView):
    permission_classes = [IsNexaStaff]
    serializer_class = AdminPaymentSerializer
    pagination_class = AdminPagination

    def get_queryset(self):
        qs = Payment.objects.select_related("user", "plan").all()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(Q(user__email__icontains=search) | Q(gateway_order_id__icontains=search) | Q(gateway_payment_id__icontains=search))
        return qs


class AdminSubscriptionListView(generics.ListAPIView):
    permission_classes = [IsNexaStaff]
    serializer_class = AdminSubscriptionSerializer
    pagination_class = AdminPagination

    def get_queryset(self):
        qs = Subscription.objects.select_related("user", "plan").all()
        status_filter = self.request.query_params.get("status")
        return qs.filter(status=status_filter.upper()) if status_filter else qs


class AdminLeadListView(generics.ListAPIView):
    permission_classes = [IsNexaStaff]
    serializer_class = AdminLeadSerializer
    pagination_class = AdminPagination
    queryset = Lead.objects.all()


class AdminNotificationListView(generics.ListAPIView):
    permission_classes = [IsNexaStaff]
    serializer_class = AdminNotificationSerializer
    pagination_class = AdminPagination

    def get_queryset(self):
        qs = Notification.objects.select_related("user").all()
        status_filter = self.request.query_params.get("email_status")
        return qs.filter(email_status=status_filter.upper()) if status_filter else qs


class AdminActivityLogListView(generics.ListAPIView):
    permission_classes = [IsNexaStaff]
    pagination_class = AdminPagination

    def get_queryset(self):
        return AdminActivityLog.objects.select_related("actor").all()

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        rows = page if page is not None else self.get_queryset()
        data = [{"id": str(row.id), "actor": row.actor.email if row.actor else "System", "action": row.action, "target_type": row.target_type, "target_id": row.target_id, "summary": row.summary, "ip_address": row.ip_address, "created_at": row.created_at} for row in rows]
        return self.get_paginated_response(data) if page is not None else Response(data)


class AdminAnalyticsView(APIView):
    """Date-filtered platform analytics built from persisted business records."""

    permission_classes = [IsNexaStaff]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", "30"))
        except (TypeError, ValueError):
            return Response({"success": False, "message": "days must be 30, 90 or 365."}, status=status.HTTP_400_BAD_REQUEST)
        if days not in (30, 90, 365):
            return Response({"success": False, "message": "days must be 30, 90 or 365."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        start = now - timedelta(days=days - 1)
        trunc = TruncMonth if days == 365 else TruncDate

        def count_series(queryset, date_field):
            rows = (queryset.filter(**{f"{date_field}__gte": start, f"{date_field}__lte": now})
                    .annotate(period=trunc(date_field)).values("period").annotate(value=Count("id")).order_by("period"))
            return [{"period": row["period"].date().isoformat() if hasattr(row["period"], "date") else row["period"].isoformat(), "value": row["value"]} for row in rows]

        revenue_rows = (Payment.objects.filter(status=Payment.Status.CAPTURED, updated_at__gte=start, updated_at__lte=now)
                        .annotate(period=trunc("updated_at")).values("period")
                        .annotate(value=Sum("amount")).order_by("period"))
        revenue_series = [{"period": row["period"].date().isoformat() if hasattr(row["period"], "date") else row["period"].isoformat(), "value_paise": int(row["value"] or 0)} for row in revenue_rows]

        invitation_status = list(Invitation.objects.filter(deleted_at__isnull=True).values("status").annotate(total=Count("id")).order_by("status"))
        rsvp_responses = list(RSVP.objects.values("response").annotate(total=Count("id")).order_by("response"))
        plan_mix = list(Subscription.objects.filter(status=Subscription.Status.ACTIVE, ends_at__gt=now).values("plan__code", "plan__name").annotate(total=Count("id")).order_by("plan__display_order"))
        template_usage = list(Invitation.objects.filter(deleted_at__isnull=True).values("template__category").annotate(total=Count("id")).order_by("template__category"))
        product_status = list(Product.objects.values("status", "active").annotate(total=Count("id")).order_by("status", "active"))
        paying_customers = Payment.objects.filter(status=Payment.Status.CAPTURED).values("user_id").distinct().count()
        registered_users = User.objects.count()
        conversion_rate = round((paying_customers / registered_users) * 100, 2) if registered_users else 0.0

        return Response({"success": True, "data": {
            "period_days": days, "start_date": start.date().isoformat(), "end_date": now.date().isoformat(),
            "series": {
                "registrations": count_series(User.objects.all(), "created_at"),
                "invitations": count_series(Invitation.objects.filter(deleted_at__isnull=True), "created_at"),
                "rsvps": count_series(RSVP.objects.all(), "responded_at"),
                "revenue": revenue_series,
            },
            "breakdowns": {"invitation_status": invitation_status, "rsvp_responses": rsvp_responses, "active_subscription_plans": plan_mix, "template_categories": template_usage, "product_portfolio": product_status},
            "totals": {
                "new_users": User.objects.filter(created_at__gte=start, created_at__lte=now).count(),
                "new_invitations": Invitation.objects.filter(deleted_at__isnull=True, created_at__gte=start, created_at__lte=now).count(),
                "new_rsvps": RSVP.objects.filter(responded_at__gte=start, responded_at__lte=now).count(),
                "captured_revenue_paise": int(Payment.objects.filter(status=Payment.Status.CAPTURED, updated_at__gte=start, updated_at__lte=now).aggregate(total=Sum("amount"))["total"] or 0),
                "active_subscriptions": Subscription.objects.filter(status=Subscription.Status.ACTIVE, ends_at__gt=now).count(),
                "paying_customers": paying_customers,
                "registered_users": registered_users,
                "customer_conversion_rate_percent": conversion_rate,
            },
        }})


class AdminReportExportView(APIView):
    """CSV exports are allow-listed, date-bounded and staff-only."""

    permission_classes = [IsNexaStaff]
    REPORTS = {"users", "invitations", "guests", "rsvps", "payments", "subscriptions", "leads"}

    @staticmethod
    def _cell(value):
        value = "" if value is None else str(value)
        # Prevent spreadsheet formula injection in user-controlled text fields.
        if value.startswith(("=", "+", "-", "@", "\t", "\r")):
            return "'" + value
        return value

    def get(self, request):
        report = request.query_params.get("report", "").lower()
        if report not in self.REPORTS:
            return Response({"success": False, "message": f"report must be one of: {', '.join(sorted(self.REPORTS))}."}, status=status.HTTP_400_BAD_REQUEST)
        start_raw, end_raw = request.query_params.get("start_date"), request.query_params.get("end_date")
        start_date = parse_date(start_raw) if start_raw else None
        end_date = parse_date(end_raw) if end_raw else None
        if (start_raw and not start_date) or (end_raw and not end_date):
            return Response({"success": False, "message": "Dates must use YYYY-MM-DD format."}, status=status.HTTP_400_BAD_REQUEST)
        if bool(start_date) != bool(end_date):
            return Response({"success": False, "message": "Provide both start_date and end_date, or leave both blank."}, status=status.HTTP_400_BAD_REQUEST)
        if start_date and end_date and start_date > end_date:
            return Response({"success": False, "message": "start_date cannot be after end_date."}, status=status.HTTP_400_BAD_REQUEST)
        if start_date and end_date and (end_date - start_date).days > 366:
            return Response({"success": False, "message": "Export date range cannot exceed 366 days."}, status=status.HTTP_400_BAD_REQUEST)

        date_field = {"users": "created_at", "invitations": "created_at", "guests": "created_at", "rsvps": "responded_at", "payments": "created_at", "subscriptions": "created_at", "leads": "created_at"}[report]
        query = {f"{date_field}__date__gte": start_date} if start_date else {}
        if end_date:
            query[f"{date_field}__date__lte"] = end_date

        if report == "users":
            rows = User.objects.filter(**query).values_list("id", "email", "full_name", "role", "subscription_tier", "is_active", "is_verified", "created_at")
            headers = ["id", "email", "full_name", "role", "subscription_tier", "is_active", "is_verified", "created_at"]
        elif report == "invitations":
            rows = Invitation.objects.filter(deleted_at__isnull=True, **query).values_list("id", "title", "slug", "user__email", "template__name", "event_type", "status", "event_date", "created_at")
            headers = ["id", "title", "slug", "owner_email", "template", "event_type", "status", "event_date", "created_at"]
        elif report == "guests":
            rows = Guest.objects.filter(**query).values_list("id", "full_name", "email", "phone_number", "invitation__title", "invitation__user__email", "invitation_sent", "created_at")
            headers = ["id", "full_name", "email", "phone_number", "invitation", "owner_email", "invitation_sent", "created_at"]
        elif report == "rsvps":
            rows = RSVP.objects.filter(**query).values_list("id", "guest__full_name", "guest__email", "invitation__title", "response", "guest_count", "message", "responded_at")
            headers = ["id", "guest_name", "guest_email", "invitation", "response", "guest_count", "message", "responded_at"]
        elif report == "payments":
            rows = Payment.objects.filter(**query).values_list("id", "user__email", "plan__name", "amount", "currency", "status", "gateway_order_id", "gateway_payment_id", "created_at", "updated_at")
            headers = ["id", "user_email", "plan", "amount_minor_units", "currency", "status", "gateway_order_id", "gateway_payment_id", "created_at", "updated_at"]
        elif report == "subscriptions":
            rows = Subscription.objects.filter(**query).values_list("id", "user__email", "plan__name", "status", "starts_at", "ends_at", "created_at")
            headers = ["id", "user_email", "plan", "status", "starts_at", "ends_at", "created_at"]
        else:
            rows = Lead.objects.filter(**query).values_list("id", "full_name", "email", "company", "source", "message", "created_at")
            headers = ["id", "full_name", "email", "company", "source", "message", "created_at"]

        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="nexainvite-{report}-report.csv"'
        response.write("\ufeff")
        writer = csv.writer(response)
        writer.writerow(headers)
        for row in rows.iterator(chunk_size=1000):
            writer.writerow([self._cell(value) for value in row])
        return response
