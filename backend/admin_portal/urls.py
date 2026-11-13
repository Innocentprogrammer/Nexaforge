from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminActivityActionsView, AdminActivityLogListView, AdminAnalyticsView, AdminDashboardView, AdminInvitationViewSet,
    AdminReportExportView,
    AdminLeadListView, AdminNotificationListView, AdminPaymentListView,
    AdminProductViewSet, AdminSubscriptionListView, AdminTemplateViewSet,
    AdminUserDetailView, AdminUserListView,
)

router = DefaultRouter()
router.register("invitations", AdminInvitationViewSet, basename="admin-invitations")
router.register("templates", AdminTemplateViewSet, basename="admin-templates")
router.register("products", AdminProductViewSet, basename="admin-products")

urlpatterns = [
    path("dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("analytics/", AdminAnalyticsView.as_view(), name="admin-analytics"),
    path("reports/export/", AdminReportExportView.as_view(), name="admin-report-export"),
    path("users/", AdminUserListView.as_view(), name="admin-users"),
    path("users/<uuid:user_id>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("payments/", AdminPaymentListView.as_view(), name="admin-payments"),
    path("subscriptions/", AdminSubscriptionListView.as_view(), name="admin-subscriptions"),
    path("leads/", AdminLeadListView.as_view(), name="admin-leads"),
    path("notifications/", AdminNotificationListView.as_view(), name="admin-notifications"),
    path("activity/", AdminActivityLogListView.as_view(), name="admin-activity"),
    path("activity/actions/", AdminActivityActionsView.as_view(), name="admin-activity-actions"),
    path("", include(router.urls)),
]
