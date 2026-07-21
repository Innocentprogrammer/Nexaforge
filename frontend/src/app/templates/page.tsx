"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
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
      .catch(() => setError("Could not load templates."))
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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary">Template Gallery</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Choose a starting design — you can customize everything after.
          </p>
        </div>
        {!user && (
          <Link href="/login">
            <Button variant="outline">Log in</Button>
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              category === c
                ? "bg-secondary text-white"
                : "bg-background-subtle text-foreground/70 hover:bg-border"
            }`}
          >
            {categoryLabel(c)}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

      {isLoading ? (
        <p className="mt-10 text-sm text-foreground/60">Loading templates…</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <div className="mb-4">
                <InvitationCanvas data={template.template_json} size="card" />
              </div>
              <div className="flex items-start justify-between">
                <h3 className="font-heading text-base font-semibold text-primary">
                  {template.name}
                </h3>
                {template.premium ? (
                  <Badge variant="warning">${template.price}</Badge>
                ) : (
                  <Badge variant="success">Free</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-foreground/50">{categoryLabel(template.category)}</p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => useTemplate(template)}
                disabled={usingId === template.id}
              >
                {usingId === template.id ? "Setting up…" : "Use Template"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
