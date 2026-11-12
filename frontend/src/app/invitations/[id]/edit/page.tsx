"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, Hint } from "@/components/ui/input";
import { Card, Badge, CardHeader, Divider } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { InvitationCanvas, FONT_OPTIONS, PATTERN_OPTIONS } from "@/components/invitation-canvas";
import { api, ApiError, downloadFile } from "@/lib/api";
import type { Invitation, MediaAsset } from "@/lib/types";

const AUTOSAVE_DELAY_MS = 30000;

/** Colour well + hex readout, sized to match the other 36px controls. */
function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex h-9 items-center gap-2.5 rounded-lg border border-border bg-background px-2 shadow-2xs transition-[border-color,box-shadow] duration-150 hover:border-border-strong focus-within:border-secondary focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--secondary)_18%,transparent)]">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 shrink-0 rounded-md border-0"
        />
        <span className="truncate font-mono text-xs uppercase tracking-wide text-muted">
          {value}
        </span>
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading invitation">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-7 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Skeleton className="h-[32rem] rounded-xl" />
        <Skeleton className="h-[32rem] rounded-xl" />
      </div>
    </div>
  );
}

function EditorContent() {
  const params = useParams<{ id: string }>();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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

  const handleImageUpload = async (file?: File) => {
    if (!file) return;
    setError(null);
    setIsUploadingImage(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", file.name);
      const asset = await api.post<MediaAsset>("/media/", form, { isForm: true });
      updateJson({ image_url: asset.url, media_asset_id: asset.id });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveNow = () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    if (invitation) save(invitation);
  };

  /** Server-rendered PDF of this invitation — available on every plan, and with
   * no guest personalisation. Gold/Diamond hosts get per-guest personalised PDFs
   * from the guest list instead. */
  const handleDownloadPdf = async () => {
    if (!invitation) return;
    setIsDownloading(true);
    setError(null);
    try {
      await downloadFile(`/invitations/${invitation.id}/pdf/`, `${invitation.slug}.pdf`);
    } catch {
      setError("Could not download the PDF.");
    } finally {
      setIsDownloading(false);
    }
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
    return <EditorSkeleton />;
  }

  if (!invitation) {
    return <Alert tone="error">{error || "Invitation not found."}</Alert>;
  }

  const json = invitation.invitation_json;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "NexaInvite", href: "/dashboard" },
          { label: "Invitations", href: "/dashboard" },
          { label: "Editor" },
        ]}
        title={invitation.title}
        meta={
          <Badge variant={invitation.status === "PUBLISHED" ? "success" : "warning"} dot>
            {invitation.status}
          </Badge>
        }
        actions={
          <>
            <span
              className="mr-1 hidden items-center gap-1.5 text-xs text-muted sm:flex"
              aria-live="polite"
            >
              {isSaving ? (
                <>
                  <span className="spinner" aria-hidden />
                  Saving…
                </>
              ) : savedAt ? (
                <>
                  <Icon name="check" size={13} className="text-success" />
                  {`Saved ${savedAt.toLocaleTimeString()}`}
                </>
              ) : (
                ""
              )}
            </span>
            <Link href={`/invitations/${invitation.id}/guests`}>
              <Button variant="outline">
                <Icon name="users" size={16} />
                Guests &amp; RSVPs
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              loading={isDownloading}
              data-testid="download-pdf"
            >
              {!isDownloading && <Icon name="download" size={16} />}
              {isDownloading ? "Preparing…" : "Download PDF"}
            </Button>
            <Button variant="outline" onClick={handleSaveNow} disabled={isSaving}>
              <Icon name="save" size={16} />
              Save
            </Button>
            {invitation.status === "PUBLISHED" ? (
              <Link href={`/i/${invitation.slug}`} target="_blank">
                <Button variant="primary">
                  <Icon name="external-link" size={16} />
                  View Public Page
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                onClick={handlePublish}
                disabled={isPublishing}
                loading={isPublishing}
              >
                {!isPublishing && <Icon name="send" size={16} />}
                {isPublishing ? "Publishing…" : "Publish"}
              </Button>
            )}
          </>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Event Details"
              description="What the invitation says, and where it points guests."
            />
            <div className="mt-5 space-y-4">
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
                <Label htmlFor="event_date">Event date &amp; time</Label>
                <Input
                  id="event_date"
                  type="datetime-local"
                  value={invitation.event_date ? invitation.event_date.slice(0, 16) : ""}
                  onChange={(e) =>
                    update({
                      event_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
                <Hint>Changes autosave every 30 seconds — or press Save to store them now.</Hint>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Design" description="Wording, colours, type, and decoration." />
            <div className="mt-5 space-y-4">
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

              <Divider className="my-6" />

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Your photo</p>
                  <p className="mt-1 text-xs text-muted">Upload a JPEG, PNG or WebP image up to 10 MB to personalize this invitation.</p>
                </div>
                {typeof json.image_url === "string" && json.image_url && (
                  <div className="flex items-center gap-3">
                    <img src={json.image_url} alt="Selected invitation" className="h-16 w-16 rounded-lg border border-border object-cover" />
                    <Button type="button" variant="outline" onClick={() => updateJson({ image_url: "", media_asset_id: "" })}>Remove image</Button>
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-background-subtle">
                  <Icon name="upload" size={16} />
                  {isUploadingImage ? "Uploading…" : "Upload image"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isUploadingImage} onChange={(event) => { void handleImageUpload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                </label>
              </div>

              <Divider className="my-6" />

              <div className="flex items-center gap-2">
                <Icon name="palette" size={16} className="text-muted" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Colours</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ColorField
                  id="background_color"
                  label="Background color"
                  value={String(json.background_color || "#ffffff")}
                  onChange={(value) => updateJson({ background_color: value })}
                />
                <ColorField
                  id="background_color_2"
                  label="Background gradient (optional)"
                  value={String(json.background_color_2 || json.background_color || "#ffffff")}
                  onChange={(value) => updateJson({ background_color_2: value })}
                />
                <ColorField
                  id="font_color"
                  label="Font color"
                  value={String(json.font_color || json.accent_color || "#1a1a2e")}
                  onChange={(value) => updateJson({ font_color: value })}
                />
                <ColorField
                  id="accent_color"
                  label="Accent color (borders & dividers)"
                  value={String(json.accent_color || "#2563eb")}
                  onChange={(value) => updateJson({ accent_color: value })}
                />
              </div>

              <Divider className="my-6" />

              <div className="flex items-center gap-2">
                <Icon name="type" size={16} className="text-muted" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Type &amp; decoration
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="heading_font">Heading font</Label>
                  <Select
                    id="heading_font"
                    value={String(json.heading_font || FONT_OPTIONS[0].key)}
                    onChange={(e) => updateJson({ heading_font: e.target.value })}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.key} value={font.key}>
                        {font.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pattern">Decoration</Label>
                  <Select
                    id="pattern"
                    value={String(json.pattern || "none")}
                    onChange={(e) => updateJson({ pattern: e.target.value })}
                  >
                    {PATTERN_OPTIONS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Preview stays in view while the form scrolls. */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-base font-semibold text-heading">Live Preview</h2>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Icon name="eye" size={14} />
              Updates as you type
            </span>
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-background-subtle p-3 shadow-sm sm:p-5">
            <div className="overflow-hidden rounded-xl shadow-lg">
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
