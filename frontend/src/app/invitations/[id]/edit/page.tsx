"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, Badge } from "@/components/ui/card";
import { InvitationCanvas, FONT_OPTIONS, PATTERN_OPTIONS } from "@/components/invitation-canvas";
import { api, ApiError } from "@/lib/api";
import type { Invitation } from "@/lib/types";

const AUTOSAVE_DELAY_MS = 30000;

function EditorContent() {
  const params = useParams<{ id: string }>();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api
      .get<Invitation>(`/invitations/${params.id}/`)
      .then(setInvitation)
      .catch(() => setError("Could not load invitation."))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  const save = useCallback(
    async (updated: Invitation) => {
      setIsSaving(true);
      try {
        const res = await api.patch<Invitation>(`/invitations/${updated.id}/`, {
          title: updated.title,
          event_type: updated.event_type,
          event_date: updated.event_date,
          venue: updated.venue,
          invitation_json: updated.invitation_json,
        });
        setInvitation(res);
        setSavedAt(new Date());
      } catch {
        setError("Could not save changes.");
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const update = (patch: Partial<Invitation>) => {
    if (!invitation) return;
    const next = { ...invitation, ...patch };
    setInvitation(next);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => save(next), AUTOSAVE_DELAY_MS);
  };

  const updateJson = (patch: Record<string, unknown>) => {
    if (!invitation) return;
    update({ invitation_json: { ...invitation.invitation_json, ...patch } });
  };

  const handleSaveNow = () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    if (invitation) save(invitation);
  };

  const handlePublish = async () => {
    if (!invitation) return;
    setIsPublishing(true);
    setError(null);
    try {
      await save(invitation);
      const res = await api.post<{ success: boolean; data: Invitation }>(
        `/invitations/${invitation.id}/publish/`
      );
      setInvitation(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not publish invitation.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-foreground/60">Loading…</p>;
  }

  if (!invitation) {
    return <p className="text-sm text-error">{error || "Invitation not found."}</p>;
  }

  const json = invitation.invitation_json;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold text-primary">{invitation.title}</h1>
          <Badge variant={invitation.status === "PUBLISHED" ? "success" : "warning"}>
            {invitation.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-foreground/50">
            {isSaving ? "Saving…" : savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : ""}
          </span>
          <Link href={`/invitations/${invitation.id}/guests`}>
            <Button variant="outline">Guests & RSVPs</Button>
          </Link>
          <Button variant="outline" onClick={handleSaveNow} disabled={isSaving}>
            Save
          </Button>
          {invitation.status === "PUBLISHED" ? (
            <Link href={`/i/${invitation.slug}`} target="_blank">
              <Button variant="primary">View Public Page</Button>
            </Link>
          ) : (
            <Button variant="primary" onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? "Publishing…" : "Publish"}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <h2 className="font-heading text-base font-semibold text-primary">Event Details</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={invitation.title}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={invitation.venue}
                onChange={(e) => update({ venue: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="event_date">Event date & time</Label>
              <Input
                id="event_date"
                type="datetime-local"
                value={invitation.event_date ? invitation.event_date.slice(0, 16) : ""}
                onChange={(e) =>
                  update({ event_date: e.target.value ? new Date(e.target.value).toISOString() : null })
                }
              />
            </div>

            <h2 className="pt-2 font-heading text-base font-semibold text-primary">Design</h2>
            <div>
              <Label htmlFor="heading">Heading</Label>
              <Input
                id="heading"
                value={String(json.heading || "")}
                onChange={(e) => updateJson({ heading: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="subheading">Subheading</Label>
              <Input
                id="subheading"
                value={String(json.subheading || "")}
                onChange={(e) => updateJson({ subheading: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="message">Message to guests</Label>
              <Textarea
                id="message"
                rows={3}
                value={String(json.message || "")}
                onChange={(e) => updateJson({ message: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="background_color">Background color</Label>
                <Input
                  id="background_color"
                  type="color"
                  value={String(json.background_color || "#ffffff")}
                  onChange={(e) => updateJson({ background_color: e.target.value })}
                  className="h-10 p-1"
                />
              </div>
              <div>
                <Label htmlFor="background_color_2">Background gradient (optional)</Label>
                <Input
                  id="background_color_2"
                  type="color"
                  value={String(json.background_color_2 || json.background_color || "#ffffff")}
                  onChange={(e) => updateJson({ background_color_2: e.target.value })}
                  className="h-10 p-1"
                />
              </div>
              <div>
                <Label htmlFor="font_color">Font color</Label>
                <Input
                  id="font_color"
                  type="color"
                  value={String(json.font_color || json.accent_color || "#1a1a2e")}
                  onChange={(e) => updateJson({ font_color: e.target.value })}
                  className="h-10 p-1"
                />
              </div>
              <div>
                <Label htmlFor="accent_color">Accent color (borders & dividers)</Label>
                <Input
                  id="accent_color"
                  type="color"
                  value={String(json.accent_color || "#2563eb")}
                  onChange={(e) => updateJson({ accent_color: e.target.value })}
                  className="h-10 p-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="heading_font">Heading font</Label>
                <select
                  id="heading_font"
                  value={String(json.heading_font || FONT_OPTIONS[0].key)}
                  onChange={(e) => updateJson({ heading_font: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.key} value={font.key}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="pattern">Decoration</Label>
                <select
                  id="pattern"
                  value={String(json.pattern || "none")}
                  onChange={(e) => updateJson({ pattern: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                >
                  {PATTERN_OPTIONS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="font-heading text-base font-semibold text-primary">Live Preview</h2>
          <div className="mt-4">
            <InvitationCanvas
              data={{
                ...json,
                title: invitation.title,
                venue: invitation.venue,
                eventDate: invitation.event_date,
              }}
              size="full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditInvitationPage() {
  return (
    <ProtectedRoute>
      <DashboardShell>
        <EditorContent />
      </DashboardShell>
    </ProtectedRoute>
  );
}
