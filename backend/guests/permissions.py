"""Subscription-tier gates for the guest endpoints.

Tier now lives on the host account (``User.subscription_tier``), so these are
plain DRF permission classes rather than a per-guest field check. They return a
real 403 with an explanation — a NORMAL host hitting the CSV import must be told
why, not handed a 200 that silently imported nothing.
"""

from rest_framework import permissions

from accounts.models import SubscriptionTier, tier_at_least


class RequiresSubscriptionTier(permissions.BasePermission):
    """Base gate: the request user's plan must be at least ``minimum_tier``."""

    minimum_tier = SubscriptionTier.GOLD
    feature_name = "This feature"
    #: Set per request in has_permission so `message` can name the actual plan.
    actual_tier = SubscriptionTier.NORMAL

    @property
    def message(self):
        return (
            f"{self.feature_name} requires the {self.minimum_tier.label} plan. "
            f"Your account is on the "
            f"{SubscriptionTier(self.actual_tier).label} plan — upgrade to unlock it."
        )

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        self.actual_tier = user.subscription_tier
        return tier_at_least(user.subscription_tier, self.minimum_tier)


class CanImportGuests(RequiresSubscriptionTier):
    """CSV guest import — Gold and above (Diamond additionally auto-sends)."""

    minimum_tier = SubscriptionTier.GOLD
    feature_name = "Importing guests from a CSV file"


class CanUsePerGuestLinks(RequiresSubscriptionTier):
    """Per-guest invite links, per-guest PDFs, the links CSV export."""

    minimum_tier = SubscriptionTier.GOLD
    feature_name = "Per-guest invite links and personalised PDFs"


class CanSendInvites(RequiresSubscriptionTier):
    """WhatsApp/SMS delivery — Diamond only."""

    minimum_tier = SubscriptionTier.DIAMOND
    feature_name = "Sending invites over WhatsApp and SMS"
