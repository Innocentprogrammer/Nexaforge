"""Move invitation tier from Guest.tier to User.subscription_tier.

Tier is a property of the *host's plan*, not of an individual guest, so the
per-guest column is dropped. Before dropping it we promote each affected host to
the tier their guests implied.

Mapping decision (best effort, and deliberately one-way):

* An owner may have had a mix of gold, diamond and untiered guests. There is no
  way to represent that on a single account field, so we take the **highest tier
  present across all of that owner's guests** — because tiers are cumulative
  (diamond includes gold's features), promoting is the only choice that doesn't
  silently take a feature away from somebody who was using it.
* An owner is only ever promoted, never demoted: if their account already sits
  at a higher tier than their guests imply, it is left alone.
* Owners with no tiered guests are untouched and stay NORMAL.
* Every affected invitation is logged (owner email, invitation id/slug, the tiers
  its guests carried, and the tier the owner ended up on) so the collapse of a
  mixed-tier host is auditable afterwards — this information does not survive
  anywhere else once the column is gone.

The reverse migration re-adds the column but cannot restore which guest had
which tier; it back-fills every guest of a gold/diamond host with that host's
tier, which is the closest inverse available.
"""

import logging

from django.db import migrations

logger = logging.getLogger(__name__)

#: Local copies — the model enums must not be imported into a migration.
RANK = {"": 0, "NORMAL": 0, "GOLD": 1, "DIAMOND": 2}


def promote_owners_from_guest_tiers(apps, schema_editor):
    Guest = apps.get_model("guests", "Guest")
    User = apps.get_model("accounts", "User")

    # invitation -> set of tiers its guests carry, and owner -> best tier seen.
    per_invitation: dict[str, set[str]] = {}
    per_owner: dict[str, str] = {}
    invitation_meta: dict[str, tuple[str, str, str]] = {}

    tiered = Guest.objects.exclude(tier="").select_related("invitation__user")
    for guest in tiered.iterator():
        invitation = guest.invitation
        owner = invitation.user
        per_invitation.setdefault(str(invitation.id), set()).add(guest.tier)
        invitation_meta[str(invitation.id)] = (invitation.slug, str(owner.id), owner.email)
        if RANK.get(guest.tier, 0) > RANK.get(per_owner.get(str(owner.id), ""), 0):
            per_owner[str(owner.id)] = guest.tier

    if not per_owner:
        logger.info("guests.0005: no tiered guests found; no owner promoted.")
        return

    promoted = {}
    for owner_id, best_tier in per_owner.items():
        owner = User.objects.get(pk=owner_id)
        if RANK.get(owner.subscription_tier, 0) >= RANK.get(best_tier, 0):
            # Already at or above what the guests imply — never demote.
            promoted[owner_id] = owner.subscription_tier
            continue
        owner.subscription_tier = best_tier
        owner.save(update_fields=["subscription_tier"])
        promoted[owner_id] = best_tier

    for invitation_id, tiers in sorted(per_invitation.items()):
        slug, owner_id, owner_email = invitation_meta[invitation_id]
        logger.warning(
            "guests.0005: invitation %s (%s) had guest tiers {%s}; owner %s is now %s.",
            invitation_id,
            slug,
            ", ".join(sorted(tiers)),
            owner_email,
            promoted.get(owner_id, "NORMAL"),
        )
        mixed = len(tiers) > 1
        if mixed:
            logger.warning(
                "guests.0005: invitation %s was MIXED-tier — collapsed to the highest "
                "tier present (%s). Per-guest tiers are not recoverable.",
                invitation_id,
                promoted.get(owner_id, "NORMAL"),
            )


def backfill_guest_tiers_from_owners(apps, schema_editor):
    """Reverse: give every guest of a gold/diamond host that host's tier.

    Cannot restore the original per-guest values — they were dropped with the
    column. This is the closest inverse, not a true rollback.
    """
    Guest = apps.get_model("guests", "Guest")
    for tier in ("GOLD", "DIAMOND"):
        Guest.objects.filter(invitation__user__subscription_tier=tier).update(tier=tier)


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_user_subscription_tier"),
        ("guests", "0004_normalize_existing_phone_numbers"),
    ]

    operations = [
        migrations.RunPython(
            promote_owners_from_guest_tiers, backfill_guest_tiers_from_owners
        ),
        migrations.RemoveIndex(model_name="guest", name="guests_gues_tier_9100ca_idx"),
        migrations.RemoveField(model_name="guest", name="tier"),
    ]
