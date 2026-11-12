"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  PublicInvitationView,
  PublicInvitationLoading,
  PublicInvitationNotFound,
  type PublicInvitation,
  type PublicInvitationGuest,
} from "@/components/public-invitation-view";
import { api } from "@/lib/api";
import { hasTier, type SubscriptionTier } from "@/lib/types";

type TokenPayload = PublicInvitation & {
  guest: PublicInvitationGuest;
  /** The host's plan — the name greeting belongs to Gold and above. */
  host_tier: SubscriptionTier;
};

/**
 * A guest's personal invite link — the destination of the URLs handed out by
 * the invite-links CSV export and the diamond WhatsApp/SMS sends. Renders
 * exactly the same page as `/i/[slug]`; the differences are that the backend
 * knows which guest opened it (so the RSVP is attributed to them) and that a
 * Gold/Diamond host's guests are greeted by name above the invitation card.
 */
export default function GuestInvitePage() {
  const params = useParams<{ token: string }>();
  const [payload, setPayload] = useState<TokenPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get<{ success: boolean; data: TokenPayload }>(`/public/invite/${params.token}/`, {
        auth: false,
      })
      .then((res) => setPayload(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [params.token]);

  if (isLoading) return <PublicInvitationLoading />;
  if (notFound || !payload) return <PublicInvitationNotFound />;

  // Gold and Diamond only. A Normal host has no per-guest links to hand out, so
  // this path is effectively unreachable for them — but if a token URL is
  // guessed or kept from an earlier plan, the page still shows no name.
  const greetingName = hasTier(payload.host_tier, "GOLD") ? payload.guest?.full_name : null;

  return (
    <PublicInvitationView
      invitation={payload}
      guest={payload.guest}
      greetingName={greetingName}
    />
  );
}
