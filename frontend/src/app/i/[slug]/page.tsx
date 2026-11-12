"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  PublicInvitationView,
  PublicInvitationLoading,
  PublicInvitationNotFound,
  type PublicInvitation,
} from "@/components/public-invitation-view";
import { api } from "@/lib/api";

export default function PublicInvitationPage() {
  const params = useParams<{ slug: string }>();
  const [invitation, setInvitation] = useState<PublicInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get<{ success: boolean; data: PublicInvitation }>(`/public/invitations/${params.slug}/`, {
        auth: false,
      })
      .then((res) => setInvitation(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [params.slug]);

  if (isLoading) return <PublicInvitationLoading />;
  if (notFound || !invitation) return <PublicInvitationNotFound />;

  return <PublicInvitationView invitation={invitation} />;
}
