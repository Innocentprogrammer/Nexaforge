"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import type { Invitation, InvitationTemplate, Paginated } from "@/lib/types";

function statusVariant(status: Invitation["status"]) {
  if (status === "PUBLISHED") return "success" as const;
  if (status === "ARCHIVED") return "error" as const;
  return "warning" as const;
}

function DashboardContent() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<Paginated<Invitation>>("/invitations/");
      setInvitations(res.results);
    } catch {
      setError("Could not load your invitations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createDraftInvitation = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const templates = await api.get<Paginated<InvitationTemplate>>("/templates/");
      const firstTemplate = templates.results[0];
      if (!firstTemplate) {
        setError("No templates available yet.");
        return;
      }
      const invitation = await api.post<Invitation>("/invitations/", {
        template: firstTemplate.id,
        title: "Untitled Invitation",
        event_type: firstTemplate.category,
        invitation_json: firstTemplate.template_json,
      });
      router.push(`/invitations/${invitation.id}/edit`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create invitation.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary">Your Invitations</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Create, edit, and publish invitations for your events.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/templates">
            <Button variant="outline">Browse Templates</Button>
          </Link>
          <Button variant="primary" onClick={createDraftInvitation} disabled={isCreating}>
            {isCreating ? "Creating…" : "+ New Invitation"}
          </Button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

      {isLoading ? (
        <p className="mt-10 text-sm text-foreground/60">Loading…</p>
      ) : invitations.length === 0 ? (
        <Card className="mt-10 flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="font-heading text-lg font-semibold text-primary">
            Create your first invitation
          </h2>
          <p className="max-w-sm text-sm text-foreground/60">
            Pick a template and start customizing — you can save as a draft and publish when
            ready.
          </p>
          <Button variant="primary" onClick={createDraftInvitation} disabled={isCreating}>
            {isCreating ? "Creating…" : "Start Now"}
          </Button>
        </Card>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {invitations.map((invitation) => (
            <Link key={invitation.id} href={`/invitations/${invitation.id}/edit`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <h3 className="font-heading text-base font-semibold text-primary">
                    {invitation.title}
                  </h3>
                  <Badge variant={statusVariant(invitation.status)}>{invitation.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-foreground/60">
                  {invitation.template_detail?.name}
                </p>
                {invitation.venue && (
                  <p className="mt-1 text-xs text-foreground/50">{invitation.venue}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardShell>
        <DashboardContent />
      </DashboardShell>
    </ProtectedRoute>
  );
}
