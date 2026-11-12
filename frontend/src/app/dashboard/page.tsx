"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Skeleton, SkeletonGrid } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { InvitationCanvas } from "@/components/invitation-canvas";
import { api, ApiError, downloadFile } from "@/lib/api";
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
  const [pdfId, setPdfId] = useState<string | null>(null);

  /** Generic invitation PDF — every plan, no guest personalisation. */
  const downloadInvitationPdf = async (invitation: Invitation) => {
    setPdfId(invitation.id);
    setError(null);
    try {
      await downloadFile(`/invitations/${invitation.id}/pdf/`, `${invitation.slug}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download the PDF.");
    } finally {
      setPdfId(null);
    }
  };

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

  // Derived from the list already on screen — no extra request.
  const published = invitations.filter((i) => i.status === "PUBLISHED").length;
  const drafts = invitations.filter((i) => i.status === "DRAFT").length;

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: "NexaInvite", href: "/dashboard" }, { label: "Invitations" }]}
        title="Your Invitations"
        description="Create, edit, and publish invitations for your events."
        actions={
          <>
            <Link href="/templates">
              <Button variant="outline">
                <Icon name="templates" size={16} />
                Browse Templates
              </Button>
            </Link>
            <Button variant="primary" onClick={createDraftInvitation} disabled={isCreating}>
              {isCreating ? (
                <>
                  <span className="spinner" aria-hidden />
                  Creating…
                </>
              ) : (
                <>
                  <Icon name="plus" size={16} />
                  New Invitation
                </>
              )}
            </Button>
          </>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      {isLoading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-[5.75rem] rounded-xl" />
            <Skeleton className="h-[5.75rem] rounded-xl" />
            <Skeleton className="h-[5.75rem] rounded-xl" />
          </div>
          <SkeletonGrid count={3} media />
        </div>
      ) : invitations.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon="gift"
            title="Create your first invitation"
            description="Pick a template and start customizing — you can save as a draft and publish when ready."
            action={
              <>
                <Button variant="primary" onClick={createDraftInvitation} disabled={isCreating}>
                  {isCreating ? "Creating…" : "Start Now"}
                </Button>
                <Link href="/templates">
                  <Button variant="outline">Browse Templates</Button>
                </Link>
              </>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total invitations"
              value={invitations.length}
              icon="file"
              tone="brand"
            />
            <StatCard label="Published" value={published} icon="check-circle" tone="success" />
            <StatCard label="Drafts" value={drafts} icon="edit" tone="warning" />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {invitations.map((invitation) => (
              <Card key={invitation.id} interactive className="flex h-full flex-col p-0">
                <Link
                  href={`/invitations/${invitation.id}/edit`}
                  className="flex flex-1 flex-col p-5 pb-4"
                >
                  <div className="overflow-hidden rounded-lg">
                    <InvitationCanvas data={invitation.invitation_json} size="card" />
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <h3 className="min-w-0 truncate font-heading text-base font-semibold text-heading">
                      {invitation.title}
                    </h3>
                    <Badge variant={statusVariant(invitation.status)} dot>
                      {invitation.status}
                    </Badge>
                  </div>
                  <p className="mt-1.5 truncate text-sm text-muted">
                    {invitation.template_detail?.name}
                  </p>
                  {invitation.venue && (
                    <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted">
                      <Icon name="map-pin" size={13} />
                      {invitation.venue}
                    </p>
                  )}
                </Link>
                {/* Outside the Link so clicking it downloads instead of navigating. */}
                <div className="flex items-center gap-1 border-t border-border px-3 py-2">
                  <button
                    onClick={() => downloadInvitationPdf(invitation)}
                    disabled={pdfId === invitation.id}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-secondary transition-colors duration-150 hover:bg-secondary/10 disabled:opacity-50"
                    data-testid="dashboard-download-pdf"
                  >
                    {pdfId === invitation.id ? (
                      <span className="spinner" aria-hidden />
                    ) : (
                      <Icon name="download" size={14} />
                    )}
                    {pdfId === invitation.id ? "Preparing…" : "Download PDF"}
                  </button>
                  <Link
                    href={`/invitations/${invitation.id}/guests`}
                    className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-foreground"
                  >
                    <Icon name="users" size={14} />
                    Guests &amp; RSVPs
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </>
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
