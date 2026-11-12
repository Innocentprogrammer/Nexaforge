"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { InvitationCanvas } from "@/components/invitation-canvas";
import type { InvitationTemplate, Invitation, Paginated } from "@/lib/types";

const CATEGORIES = [
  "ALL",
  "WEDDING",
  "BIRTHDAY",
  "ANNIVERSARY",
  "CORPORATE",
  "RELIGIOUS",
  "BABY_SHOWER",
];

export default function TemplatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
  const [category, setCategory] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [usingId, setUsingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const query = category === "ALL" ? "" : `?category=${category}`;
    api
      .get<Paginated<InvitationTemplate>>(`/templates/${query}`, { auth: false })
      .then((res) => setTemplates(res.results))
      .catch(() => setError("Could not load templates. Please check that the backend is running and the starter catalogue has been loaded."))
      .finally(() => setIsLoading(false));
  }, [category]);

  const useTemplate = async (template: InvitationTemplate) => {
    if (!user) {
      router.push("/register");
      return;
    }
    setUsingId(template.id);
    try {
      const invitation = await api.post<Invitation>("/invitations/", {
        template: template.id,
        title: template.name,
        event_type: template.category,
        invitation_json: template.template_json,
      });
      router.push(`/invitations/${invitation.id}/edit`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create invitation.");
    } finally {
      setUsingId(null);
    }
  };

  const categoryLabel = useMemo(
    () => (c: string) => c.replace("_", " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase()),
    []
  );

  return (
    <MarketingShell>
      <div className="bg-background-subtle">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-secondary">
                <Icon name="sparkles" size={13} />
                NexaInvite
              </span>
              <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-heading sm:text-4xl">
                Template Gallery
              </h1>
              <p className="mt-2.5 max-w-xl text-base leading-7 text-muted">
                Choose a starting design — you can customize everything after.
              </p>
            </div>
            {user && (
              <Link href="/dashboard">
                <Button variant="outline">
                  <Icon name="dashboard" size={16} />
                  Back to dashboard
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Icon name="filter" size={16} className="text-muted" />
            <Segmented
              ariaLabel="Filter templates by event type"
              options={CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c) }))}
              value={category}
              onChange={setCategory}
            />
          </div>

          {error && (
            <div className="mt-6">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          {isLoading ? (
            <SkeletonGrid
              count={6}
              media
              className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            />
          ) : templates.length === 0 ? (
            <Card className="mt-8 p-0">
              <EmptyState
                icon="templates"
                title="No templates in this category yet"
                description="Try another event type — new designs are added regularly."
                action={
                  <Button variant="outline" onClick={() => setCategory("ALL")}>
                    Show all templates
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} interactive className="flex flex-col">
                  <div className="overflow-hidden rounded-lg">
                    <InvitationCanvas data={template.template_json} size="card" />
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-3">
                    <h3 className="min-w-0 font-heading text-base font-semibold text-heading">
                      {template.name}
                    </h3>
                    {template.premium ? (
                      <Badge variant="warning">₹{template.price}</Badge>
                    ) : (
                      <Badge variant="success">Free</Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                    {categoryLabel(template.category)}
                  </p>
                  <Button
                    variant="primary"
                    className="mt-5 w-full"
                    onClick={() => useTemplate(template)}
                    disabled={usingId === template.id}
                    loading={usingId === template.id}
                  >
                    {usingId === template.id ? "Setting up…" : "Use Template"}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </MarketingShell>
  );
}
