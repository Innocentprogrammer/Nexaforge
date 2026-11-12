import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class SubscriptionTier(models.TextChoices):
    """The host's plan. Tiers are cumulative: each includes everything below it.

    This lives on the *host account*, not on individual guests — a guest cannot
    be "gold" while the account is not. (It used to be a per-guest column; see
    guests/migrations/0005 for the one-way mapping that moved it here.)
    """

    NORMAL = "NORMAL", "Normal"
    GOLD = "GOLD", "Gold"
    DIAMOND = "DIAMOND", "Diamond"


#: Rank used for "higher tier includes lower tier's features" comparisons.
TIER_RANK = {
    SubscriptionTier.NORMAL: 0,
    SubscriptionTier.GOLD: 1,
    SubscriptionTier.DIAMOND: 2,
}


def tier_rank(tier: str) -> int:
    return TIER_RANK.get(tier, 0)


def tier_at_least(tier: str, minimum: str) -> bool:
    """True when `tier` unlocks everything `minimum` unlocks."""
    return tier_rank(tier) >= tier_rank(minimum)


class User(AbstractUser):
    """Custom user model per Documentation/Database Design.MD `users` table."""

    class Role(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        PLANNER = "PLANNER", "Wedding Planner"
        ADMIN = "ADMIN", "Admin"

    #: Re-exported so callers can use `User.SubscriptionTier.GOLD`.
    SubscriptionTier = SubscriptionTier

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    subscription_tier = models.CharField(
        max_length=10,
        choices=SubscriptionTier.choices,
        default=SubscriptionTier.NORMAL,
        help_text="Effective account tier, updated by verified subscription payments.",
    )
    is_verified = models.BooleanField(default=False)
    profile_image = models.ImageField(upload_to="profile_images/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def has_tier(self, minimum: str) -> bool:
        return tier_at_least(self.subscription_tier, minimum)

    @property
    def is_gold_or_better(self) -> bool:
        return self.has_tier(SubscriptionTier.GOLD)

    @property
    def is_diamond(self) -> bool:
        return self.subscription_tier == SubscriptionTier.DIAMOND

    def __str__(self):
        return self.email
