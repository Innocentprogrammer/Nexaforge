from django.urls import path

from .views import CreateOrderView, MySubscriptionView, PaymentHistoryView, PlanListView, RazorpayWebhookView, VerifyPaymentView

urlpatterns = [
    path("subscription-plans/", PlanListView.as_view(), name="subscription-plans"),
    path("payments/create-order/", CreateOrderView.as_view(), name="payments-create-order"),
    path("payments/verify/", VerifyPaymentView.as_view(), name="payments-verify"),
    path("payments/webhook/razorpay/", RazorpayWebhookView.as_view(), name="payments-razorpay-webhook"),
    path("subscriptions/me/", MySubscriptionView.as_view(), name="subscriptions-me"),
    path("payments/history/", PaymentHistoryView.as_view(), name="payments-history"),
]
