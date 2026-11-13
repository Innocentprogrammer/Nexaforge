from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from admin_portal.models import AdminActivityLog
from invitations.models import Invitation
from templates_app.models import InvitationTemplate

User = get_user_model()


class AdminPortalPermissionTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(username="customer@example.com", email="customer@example.com", password="StrongPass123!")
        self.staff = User.objects.create_user(username="staff@example.com", email="staff@example.com", password="StrongPass123!", is_staff=True)
        self.url = "/api/v1/admin/dashboard/"

    def test_customer_role_without_staff_flag_is_forbidden(self):
        self.customer.role = User.Role.ADMIN
        self.customer.save(update_fields=["role"])
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_view_dashboard(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("kpis", response.data["data"])

    def test_anonymous_user_is_rejected(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AdminPortalActionTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(username="staff@example.com", email="staff@example.com", password="StrongPass123!", is_staff=True)
        self.customer = User.objects.create_user(username="customer@example.com", email="customer@example.com", password="StrongPass123!")
        self.template = InvitationTemplate.objects.create(name="Classic", category=InvitationTemplate.Category.WEDDING)
        self.invitation = Invitation.objects.create(user=self.customer, template=self.template, title="Wedding")
        self.client.force_authenticate(self.staff)

    def test_staff_can_deactivate_customer_and_action_is_audited(self):
        response = self.client.patch(f"/api/v1/admin/users/{self.customer.pk}/", {"is_active": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.is_active)
        self.assertTrue(AdminActivityLog.objects.filter(action="USER_UPDATED", target_id=str(self.customer.pk)).exists())

    def test_staff_cannot_change_subscription_tier_manually(self):
        response = self.client.patch(f"/api/v1/admin/users/{self.customer.pk}/", {"subscription_tier": "DIAMOND"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_can_archive_invitation_without_deleting_it(self):
        response = self.client.patch(f"/api/v1/admin/invitations/{self.invitation.pk}/", {"status": "ARCHIVED"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.invitation.refresh_from_db()
        self.assertEqual(self.invitation.status, Invitation.Status.ARCHIVED)
        self.assertTrue(Invitation.objects.filter(pk=self.invitation.pk).exists())

    def test_template_is_deactivated_not_removed_when_in_use(self):
        response = self.client.delete(f"/api/v1/admin/templates/{self.template.pk}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.template.refresh_from_db()
        self.assertFalse(self.template.active)


class AdminAnalyticsAndReportTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            username="analytics-staff@example.com",
            email="analytics-staff@example.com",
            password="StrongPass123!",
            is_staff=True,
        )
        self.customer = User.objects.create_user(
            username="analytics-customer@example.com",
            email="analytics-customer@example.com",
            password="StrongPass123!",
            full_name="=HYPERLINK(\"https://example.invalid\")",
        )
        self.template = InvitationTemplate.objects.create(
            name="Analytics Wedding", category=InvitationTemplate.Category.WEDDING
        )
        self.invitation = Invitation.objects.create(
            user=self.customer, template=self.template, title="Analytics Wedding"
        )
        self.client.force_authenticate(self.staff)

    def test_analytics_returns_real_totals_and_breakdowns(self):
        from guests.models import Guest
        from rsvp.models import RSVP

        guest = Guest.objects.create(invitation=self.invitation, full_name="Guest One")
        RSVP.objects.create(
            guest=guest,
            invitation=self.invitation,
            response=RSVP.Response.ACCEPTED,
            guest_count=2,
        )
        response = self.client.get("/api/v1/admin/analytics/?days=30")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertEqual(data["totals"]["new_users"], 2)
        self.assertEqual(data["totals"]["new_invitations"], 1)
        self.assertEqual(data["totals"]["new_rsvps"], 1)
        self.assertEqual(data["breakdowns"]["rsvp_responses"][0]["response"], RSVP.Response.ACCEPTED)

    def test_captured_payment_contributes_to_revenue_and_conversion(self):
        from datetime import timedelta
        from django.utils import timezone
        from subscriptions.models import Payment, Subscription, SubscriptionPlan

        plan = SubscriptionPlan.objects.create(
            code=SubscriptionPlan.Code.GOLD if hasattr(SubscriptionPlan, "Code") else "GOLD",
            name="Gold", amount=29900, duration_days=30,
        )
        subscription = Subscription.objects.create(
            user=self.customer, plan=plan, status=Subscription.Status.ACTIVE,
            starts_at=timezone.now(), ends_at=timezone.now() + timedelta(days=30),
        )
        Payment.objects.create(
            user=self.customer, subscription=subscription, plan=plan,
            amount=29900, currency="INR", status=Payment.Status.CAPTURED,
        )
        response = self.client.get("/api/v1/admin/analytics/?days=30")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        totals = response.data["data"]["totals"]
        self.assertEqual(totals["captured_revenue_paise"], 29900)
        self.assertEqual(totals["paying_customers"], 1)
        self.assertEqual(totals["customer_conversion_rate_percent"], 50.0)

    def test_analytics_rejects_unsupported_period(self):
        response = self.client.get("/api/v1/admin/analytics/?days=14")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_csv_export_neutralizes_spreadsheet_formulas(self):
        response = self.client.get("/api/v1/admin/reports/export/?report=users")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", response["Content-Type"])
        self.assertIn("'=HYPERLINK", response.content.decode("utf-8-sig"))

    def test_report_export_rejects_unknown_report(self):
        response = self.client.get("/api/v1/admin/reports/export/?report=all-secrets")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_report_export_rejects_invalid_date_range(self):
        response = self.client.get(
            "/api/v1/admin/reports/export/?report=users&start_date=2026-12-31&end_date=2026-01-01"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_report_export_requires_both_date_bounds(self):
        response = self.client.get(
            "/api/v1/admin/reports/export/?report=users&start_date=2026-01-01"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_staff_cannot_access_analytics_or_exports(self):
        self.client.force_authenticate(self.customer)
        analytics = self.client.get("/api/v1/admin/analytics/")
        export = self.client.get("/api/v1/admin/reports/export/?report=users")
        self.assertEqual(analytics.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(export.status_code, status.HTTP_403_FORBIDDEN)


class AdminLeadsTests(APITestCase):
    """GET /admin/leads/ used to 500 (rendered as an HTML page in the UI)."""

    def setUp(self):
        from leads.models import Lead

        self.staff = User.objects.create_user(
            username="staff@example.com", email="staff@example.com",
            password="StrongPass123!", is_staff=True,
        )
        Lead.objects.create(
            full_name="Priya", email="priya@example.com", company="Acme",
            message="Interested in <b>Diamond</b> plan",
        )

    def test_staff_can_list_leads_as_json(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get("/api/v1/admin/leads/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("application/json", response["Content-Type"])
        self.assertEqual(response.data["count"], 1)
        row = response.data["results"][0]
        self.assertEqual(row["email"], "priya@example.com")
        self.assertEqual(row["message"], "Interested in <b>Diamond</b> plan")


class ActivityLogTests(APITestCase):
    """Phase 8: user, guest, invitation and billing events reach the activity log."""

    def setUp(self):
        self.staff = User.objects.create_user(
            username="staff@example.com", email="staff@example.com",
            password="StrongPass123!", is_staff=True,
        )
        self.template = InvitationTemplate.objects.create(name="Wedding", category="WEDDING")

    def actions(self):
        return list(AdminActivityLog.objects.order_by("created_at").values_list("action", flat=True))

    def test_register_login_and_failed_login_are_logged(self):
        self.client.post(
            "/api/v1/auth/register/",
            {"email": "new@example.com", "full_name": "New",
             "password": "StrongPass123!", "confirm_password": "StrongPass123!"},
            format="json",
        )
        self.client.post("/api/v1/auth/login/", {"email": "new@example.com", "password": "StrongPass123!"}, format="json")
        self.client.post("/api/v1/auth/login/", {"email": "new@example.com", "password": "wrong"}, format="json")
        self.client.post("/api/v1/auth/login/", {"email": "nobody@example.com", "password": "wrong"}, format="json")
        self.assertEqual(self.actions(), ["USER_REGISTERED", "USER_LOGIN", "USER_LOGIN_FAILED"])
        login = AdminActivityLog.objects.get(action="USER_LOGIN")
        self.assertEqual(login.actor.email, "new@example.com")
        self.assertIsNotNone(login.ip_address)

    def test_invitation_and_guest_lifecycle_is_logged(self):
        owner = User.objects.create_user(username="o@example.com", email="o@example.com", password="StrongPass123!")
        self.client.force_authenticate(owner)
        r = self.client.post("/api/v1/invitations/", {"title": "Party", "template": str(self.template.id)}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        inv_id = r.data["id"] if "id" in r.data else r.data["data"]["id"]
        for title in ("Party 2", "Party 3"):  # autosave burst -> one UPDATED row
            self.client.patch(f"/api/v1/invitations/{inv_id}/", {"title": title}, format="json")
        g = self.client.post(f"/api/v1/invitations/{inv_id}/guests/", {"full_name": "A", "phone_number": "9876543210"}, format="json")
        gid = g.data["data"]["id"]
        self.client.patch(f"/api/v1/guests/{gid}/", {"full_name": "A2"}, format="json")
        self.client.delete(f"/api/v1/guests/{gid}/")
        self.client.delete(f"/api/v1/invitations/{inv_id}/")
        self.assertEqual(
            self.actions(),
            ["INVITATION_CREATED", "INVITATION_UPDATED", "GUEST_ADDED", "GUEST_UPDATED", "GUEST_DELETED", "INVITATION_DELETED"],
        )
        self.assertTrue(all(row.actor_id == owner.id for row in AdminActivityLog.objects.all()))

    def test_subscription_expiry_is_logged_as_system(self):
        from datetime import timedelta
        from django.utils import timezone
        from subscriptions.models import Subscription, SubscriptionPlan
        from subscriptions.tasks import expire_subscriptions

        user = User.objects.create_user(username="g@example.com", email="g@example.com", password="StrongPass123!", subscription_tier="GOLD")
        plan = SubscriptionPlan.objects.create(code="GOLD", name="Gold", amount=29900)
        Subscription.objects.create(user=user, plan=plan, status="ACTIVE", ends_at=timezone.now() - timedelta(minutes=1))
        expire_subscriptions.run()
        row = AdminActivityLog.objects.get(action="SUBSCRIPTION_EXPIRED")
        self.assertIsNone(row.actor)
        self.assertIn("g@example.com", row.summary)

    def test_admin_can_filter_activity(self):
        owner = User.objects.create_user(username="o@example.com", email="o@example.com", password="StrongPass123!")
        self.client.force_authenticate(owner)
        self.client.post("/api/v1/invitations/", {"title": "Party", "template": str(self.template.id)}, format="json")
        self.client.post("/api/v1/auth/logout/")
        self.client.force_authenticate(self.staff)
        r = self.client.get("/api/v1/admin/activity/?action=INVITATION_CREATED")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["count"], 1)
        self.assertEqual(r.data["results"][0]["actor"], "o@example.com")
        self.assertEqual(self.client.get("/api/v1/admin/activity/?actor=nobody").data["count"], 0)
        self.assertEqual(self.client.get("/api/v1/admin/activity/?start_date=bad").status_code, 400)
        actions = self.client.get("/api/v1/admin/activity/actions/").data["data"]
        self.assertIn("USER_LOGOUT", actions)

    def test_logging_failure_never_breaks_the_action(self):
        from unittest import mock

        owner = User.objects.create_user(username="o@example.com", email="o@example.com", password="StrongPass123!")
        self.client.force_authenticate(owner)
        with mock.patch("admin_portal.activity.AdminActivityLog.objects.create", side_effect=RuntimeError("db down")):
            r = self.client.post("/api/v1/invitations/", {"title": "Party", "template": str(self.template.id)}, format="json")
        self.assertEqual(r.status_code, 201)
