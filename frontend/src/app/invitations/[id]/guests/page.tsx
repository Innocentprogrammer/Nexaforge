"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, FileInput, FieldError } from "@/components/ui/input";
import { Card, Badge, CardHeader, StatCard } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows, Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/dialog";
import { api, ApiError, downloadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { hasTier } from "@/lib/types";
import type {
  Guest,
  GuestSendStatus,
  ImportSummary,
  Invitation,
  RSVPSummary,
  SendStatusMeta,
} from "@/lib/types";

/** How often to re-poll send-status while a diamond send is in flight. */
const SEND_POLL_INTERVAL_MS = 2000;

function rsvpVariant(status: Guest["rsvp_status"]) {
  if (status === "ACCEPTED") return "success" as const;
  if (status === "DECLINED") return "error" as const;
  if (status === "MAYBE") return "warning" as const;
  return "default" as const;
}

/** Digits only, so "98765 43210" finds +919876543210. */
function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

function guestMatches(guest: Guest, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (guest.full_name.toLowerCase().includes(q)) return true;
  if ((guest.email || "").toLowerCase().includes(q)) return true;
  const qDigits = digitsOf(q);
  // Require a few digits so a stray "1" in a name search doesn't match every phone.
  return qDigits.length >= 3 && digitsOf(guest.phone_number || "").includes(qDigits);
}

type GuestForm = { full_name: string; email: string; phone_number: string; group_name: string };
type GuestFormErrors = Partial<Record<keyof GuestForm | "form", string>>;

/** DRF field errors -> one message per form field. */
function guestFormErrors(err: unknown): GuestFormErrors {
  if (!(err instanceof ApiError)) return { form: "Could not save the guest. Please try again." };
  const body = err.body;
  if (!body || typeof body !== "object") return { form: err.message };
  const out: GuestFormErrors = {};
  for (const [field, value] of Object.entries(body as Record<string, unknown>)) {
    const text = Array.isArray(value) ? value.filter((v) => typeof v === "string").join(" ") : typeof value === "string" ? value : "";
    if (!text) continue;
    if (field === "full_name" || field === "email" || field === "phone_number" || field === "group_name") out[field] = text;
    else if (field !== "success") out.form = out.form ? `${out.form} ${text}` : text;
  }
  return Object.keys(out).length ? out : { form: err.message };
}

function sendVariant(status: GuestSendStatus["status"]) {
  if (status === "SENT") return "success" as const;
  if (status === "FAILED") return "error" as const;
  return "warning" as const;
}

function GuestsSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading guest list">
      <div>
        <Skeleton className="h-4 w-52" />
        <Skeleton className="mt-3 h-7 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[5.75rem] rounded-xl" />
        ))}
      </div>
      <div className="rounded-xl border border-border bg-background shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-3 w-40" />
        </div>
        <SkeletonRows rows={4} />
      </div>
    </div>
  );
}

function GuestsContent() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  // Tier is the host's plan, not a per-guest column — every gate on this page
  // reads from the account, and "diamond includes gold" is handled by hasTier.
  const tier = user?.subscription_tier ?? "NORMAL";
  const canUseLinks = hasTier(tier, "GOLD");
  const canSend = hasTier(tier, "DIAMOND");

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [summary, setSummary] = useState<RSVPSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Search (client-side: the page already holds this invitation's full list).
  const [searchQuery, setSearchQuery] = useState("");
  // Edit guest dialog.
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editForm, setEditForm] = useState<GuestForm>({ full_name: "", email: "", phone_number: "", group_name: "" });
  const [editErrors, setEditErrors] = useState<GuestFormErrors>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [group, setGroup] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pdfGuestId, setPdfGuestId] = useState<string | null>(null);
  const [sendRows, setSendRows] = useState<GuestSendStatus[]>([]);
  const [sendMeta, setSendMeta] = useState<SendStatusMeta | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSendStatus = useCallback(async () => {
    try {
      const res = await api.get<{ data: GuestSendStatus[]; meta: SendStatusMeta }>(
        `/invitations/${params.id}/guests/send-status/`
      );
      setSendRows(res.data);
      setSendMeta(res.meta);
      return res.meta;
    } catch {
      return null;
    }
  }, [params.id]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [inv, guestList, rsvp] = await Promise.all([
        api.get<Invitation>(`/invitations/${params.id}/`),
        api.get<{ success: boolean; data: Guest[] }>(`/invitations/${params.id}/guests/`),
        api.get<{ success: boolean; data: unknown; meta: RSVPSummary }>(
          `/invitations/${params.id}/rsvp/`
        ),
      ]);
      setInvitation(inv);
      setGuests(guestList.data);
      setSummary(rsvp.meta);
      if (canSend) await loadSendStatus();
    } catch {
      setError("Could not load guest list.");
    } finally {
      setIsLoading(false);
    }
  }, [params.id, canSend, loadSendStatus]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, canSend]);

  // Poll while the worker still has guests to get through, then stop.
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const meta = await loadSendStatus();
      if (meta && !meta.in_flight && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setIsSending(false);
      }
    }, SEND_POLL_INTERVAL_MS);
  }, [loadSendStatus]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const addGuest = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phoneNumber.trim()) {
      setError("Name and phone number are required.");
      return;
    }
    setIsAdding(true);
    setError(null);
    try {
      const res = await api.post<{ success: boolean; data: Guest }>(
        `/invitations/${params.id}/guests/`,
        { full_name: name, email, phone_number: phoneNumber, group_name: group }
      );
      setGuests((prev) => [...prev, res.data]);
      setName("");
      setEmail("");
      setPhoneNumber("");
      setGroup("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add guest.");
    } finally {
      setIsAdding(false);
    }
  };

  const visibleGuests = useMemo(
    () => guests.filter((guest) => guestMatches(guest, searchQuery)),
    [guests, searchQuery]
  );
  const isSearching = searchQuery.trim().length > 0;

  const openEdit = (guest: Guest) => {
    setEditingGuest(guest);
    setEditForm({
      full_name: guest.full_name,
      email: guest.email || "",
      phone_number: guest.phone_number || "",
      group_name: guest.group_name || "",
    });
    setEditErrors({});
  };

  const closeEdit = () => {
    if (isSavingEdit) return;
    setEditingGuest(null);
    setEditErrors({});
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingGuest) return;
    const errors: GuestFormErrors = {};
    if (!editForm.full_name.trim()) errors.full_name = "Name is required.";
    if (!editForm.phone_number.trim()) errors.phone_number = "Phone number is required.";
    if (Object.keys(errors).length) {
      setEditErrors(errors);
      return;
    }
    setIsSavingEdit(true);
    setEditErrors({});
    try {
      const updated = await api.patch<Guest>(`/guests/${editingGuest.id}/`, {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone_number: editForm.phone_number.trim(),
        group_name: editForm.group_name.trim(),
      });
      setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setNotice(`Saved changes to ${updated.full_name}.`);
      setEditingGuest(null);
    } catch (err) {
      setEditErrors(guestFormErrors(err));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const removeGuest = async (id: string) => {
    try {
      await api.delete(`/guests/${id}/`);
      setGuests((prev) => prev.filter((g) => g.id !== id));
    } catch {
      setError("Could not remove guest.");
    }
  };

  const importGuests = async (e: FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setIsImporting(true);
    setImportError(null);
    setImportSummary(null);
    setNotice(null);
    try {
      const form = new FormData();
      form.append("file", importFile);
      form.append("invitation_id", params.id);
      const res = await api.post<{ message: string; data: Guest[]; meta: ImportSummary }>(
        "/guests/import/",
        form,
        { isForm: true }
      );
      setGuests((prev) => [...prev, ...res.data]);
      setImportSummary(res.meta);
      setNotice(res.message);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Diamond imports enqueue the send themselves, so start watching delivery
      // straight away — there is no separate "Send" click to trigger it.
      if (res.meta.auto_send && res.meta.queued_for_send > 0) {
        setIsSending(true);
        // Seed the counts from the import summary before the first status fetch
        // lands. Without this the table keeps showing the pre-import totals for
        // a moment — i.e. "0 sent · 0 pending" while a send is actually in
        // flight, which reads as "nothing happened".
        setSendMeta((prev) => ({
          total: (prev?.total ?? 0) + res.meta.queued_for_send,
          sent: prev?.sent ?? 0,
          failed: prev?.failed ?? 0,
          pending: (prev?.pending ?? 0) + res.meta.queued_for_send,
          in_flight: true,
        }));
        await loadSendStatus();
        startPolling();
      }
    } catch (err) {
      setImportError(err instanceof ApiError ? err.message : "Could not import guests.");
    } finally {
      setIsImporting(false);
    }
  };

  const exportInviteLinks = async () => {
    setIsExporting(true);
    setError(null);
    setNotice(null);
    try {
      await downloadFile(
        `/invitations/${params.id}/guests/export-links/`,
        "invite-links.csv",
        { method: "POST" }
      );
      setNotice(`Exported unique invite links for ${guests.length} guest(s).`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not export invite links.");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadInvitationPdf = async () => {
    setError(null);
    try {
      await downloadFile(`/invitations/${params.id}/pdf/`, "invitation.pdf");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download the PDF.");
    }
  };

  const downloadGuestPdf = async (guest: Guest) => {
    setPdfGuestId(guest.id);
    setError(null);
    try {
      await downloadFile(`/guests/${guest.id}/pdf/`, `${guest.full_name}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download the PDF.");
    } finally {
      setPdfGuestId(null);
    }
  };

  const resendInvites = async () => {
    setIsSending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.post<{ message: string }>(
        `/invitations/${params.id}/guests/send-diamond-invites/`
      );
      setNotice(res.message);
      await loadSendStatus();
      startPolling();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the send.");
      setIsSending(false);
    }
  };

  if (isLoading) return <GuestsSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "NexaInvite", href: "/dashboard" },
          { label: "Invitations", href: "/dashboard" },
          { label: invitation?.title || "Invitation", href: `/invitations/${params.id}/edit` },
          { label: "Guests & RSVPs" },
        ]}
        title={
          <>
            Guests &amp; RSVPs
            <span className="text-muted"> — </span>
            <span className="font-normal text-foreground/80">{invitation?.title}</span>
          </>
        }
        meta={
          <Badge
            variant={canSend ? "success" : canUseLinks ? "warning" : "default"}
            dot
            data-testid="plan-badge"
          >
            {tier} plan
          </Badge>
        }
        description="Manage your guest list and track responses."
        actions={
          <>
            <Button variant="outline" onClick={downloadInvitationPdf} data-testid="download-pdf">
              <Icon name="download" size={16} />
              Download PDF
            </Button>
            {canUseLinks && guests.length > 0 && (
              <Button
                variant="outline"
                onClick={exportInviteLinks}
                disabled={isExporting}
                loading={isExporting}
                data-testid="export-invite-links"
              >
                {!isExporting && <Icon name="link" size={16} />}
                {isExporting ? "Exporting…" : `Export Invite Links (${guests.length})`}
              </Button>
            )}
            {canSend && guests.length > 0 && (
              <Button
                variant="primary"
                onClick={resendInvites}
                disabled={isSending}
                loading={isSending}
                data-testid="resend-invites"
              >
                {!isSending && <Icon name="send" size={16} />}
                {isSending ? "Sending…" : `Resend to All Guests (${guests.length})`}
              </Button>
            )}
            <Link href={`/invitations/${params.id}/edit`}>
              <Button variant="outline">
                <Icon name="arrow-left" size={16} />
                Back to Editor
              </Button>
            </Link>
          </>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && (
        <Alert tone="success" data-testid="guest-notice">
          {notice}
        </Alert>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Total Guests"
            value={summary.total_guests}
            icon="users"
            tone="brand"
          />
          <StatCard label="Accepted" value={summary.accepted} icon="check-circle" tone="success" />
          <StatCard label="Declined" value={summary.declined} icon="x-circle" tone="error" />
          <StatCard label="Maybe" value={summary.maybe} icon="info" tone="warning" />
          <StatCard label="Pending" value={summary.pending} icon="clock" />
          <StatCard
            label="Expected attendees"
            value={
              <span data-testid="expected-attendees">
                {summary.expected_attendance}
                {summary.maybe_attendance > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-muted">
                    +{summary.maybe_attendance} maybe
                  </span>
                )}
              </span>
            }
            icon="users"
            tone="success"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Add Guest" description="One guest at a time — available on every plan." />
          <form onSubmit={addGuest} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="g_email">Email</Label>
              <Input
                id="g_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guest@example.com"
              />
            </div>
            <div>
              <Label htmlFor="g_phone">Phone *</Label>
              <Input
                id="g_phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+919876543210"
                required
              />
            </div>
            <div>
              <Label htmlFor="g_group">Group</Label>
              <Input
                id="g_group"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="Family, College, Work…"
              />
            </div>
            <div className="flex items-end sm:justify-start">
              <Button type="submit" variant="primary" disabled={isAdding} loading={isAdding}>
                {!isAdding && <Icon name="plus" size={16} />}
                {isAdding ? "Adding…" : "Add Guest"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader
            title="Import Guests from CSV"
            description={
              <>
                Columns:{" "}
                <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-foreground/80">
                  full_name, email, phone_number, group_name
                </code>
                . <strong>full_name</strong> and <strong>phone_number</strong> are mandatory on
                every row — otherwise the whole file is rejected. Numbers already in the guest list
                are skipped as duplicates.
              </>
            }
          />

          <div className="mt-4">
            {canSend ? (
              <Alert tone="warning" title="Invites are sent automatically on import." data-testid="auto-send-warning">
                Every valid number in the file receives a WhatsApp or SMS message as soon as the
                upload finishes — there is no confirmation step. Numbers already in the guest list
                (or repeated in the file) are skipped and not messaged again, and numbers that
                aren&apos;t 10-digit Indian numbers are not sent at all; both are listed in the
                summary below.
              </Alert>
            ) : canUseLinks ? (
              <p className="text-sm leading-6 text-muted">
                Imported guests each get a unique invite link and a personalised PDF. Your plan has
                no send channel — hand the links out yourself.
              </p>
            ) : (
              <Alert tone="info" title="CSV import is a Gold plan feature." data-testid="import-locked-note">
                Your account is on the Normal plan — add guests with the form above, or share the
                single public invitation link.
              </Alert>
            )}
          </div>

          <form onSubmit={importGuests} className="mt-5 flex flex-wrap items-end gap-3">
            <div className="min-w-[15rem] flex-1">
              <Label htmlFor="csv_file">CSV file</Label>
              <FileInput
                id="csv_file"
                ref={fileInputRef}
                accept=".csv,text/csv"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                data-testid="csv-file-input"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={isImporting || !importFile}
              loading={isImporting}
              data-testid="import-guests"
            >
              {!isImporting && <Icon name="upload" size={16} />}
              {isImporting ? "Importing…" : canSend ? "Import & Send Invites" : "Import Guests"}
            </Button>
          </form>

          {importError && (
            <div className="mt-4">
              <Alert tone="error" data-testid="import-error">
                {importError}
              </Alert>
            </div>
          )}
        </Card>
      </div>

      {importSummary && (
        <Card data-testid="import-summary">
          <CardHeader title="Import Summary" description="What the upload did, row by row." />
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Imported"
              value={<span data-testid="summary-imported">{importSummary.imported}</span>}
              icon="users"
              tone="brand"
            />
            <StatCard
              label="Sent"
              value={<span data-testid="summary-sent">{importSummary.queued_for_send}</span>}
              icon="send"
              tone="success"
            />
            <StatCard
              label="Duplicates collapsed"
              value={
                <span data-testid="summary-duplicates">{importSummary.duplicates_collapsed}</span>
              }
              icon="refresh"
              tone="warning"
            />
            <StatCard
              label="Rejected format"
              value={<span data-testid="summary-rejected">{importSummary.invalid_numbers}</span>}
              icon="warning"
              tone="error"
            />
          </div>

          {importSummary.duplicates.length > 0 && (
            <div className="mt-6 rounded-xl border border-border bg-background-subtle p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-heading">
                <Icon name="refresh" size={14} className="text-warning" />
                Collapsed duplicates — not added again
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/70">
                {importSummary.duplicates.map((dup, i) => (
                  <li key={i} data-testid="summary-duplicate-row">
                    <span className="font-medium text-heading">{dup.full_name}</span>{" "}
                    <span className="font-mono text-xs">{dup.phone_number}</span> — {dup.reason}.
                  </li>
                ))}
              </ul>
            </div>
          )}

          {importSummary.rejected.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-background-subtle p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-heading">
                <Icon name="warning" size={14} className="text-error" />
                Not sent — invalid number format
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/70">
                {importSummary.rejected.map((row, i) => (
                  <li key={i} data-testid="summary-rejected-row">
                    <span className="font-medium text-heading">{row.full_name}</span>{" "}
                    <span className="font-mono text-xs">{row.phone_number || "(blank)"}</span> —
                    expected a 10-digit Indian number. The guest was still added; fix the number and
                    resend.
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <h2 className="font-heading text-base font-semibold text-heading">Guest List</h2>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            {guests.length > 0 && (
              <div className="relative w-full sm:w-72">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <Icon name="search" size={15} />
                </span>
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSearchQuery("");
                  }}
                  placeholder="Search name, email or phone"
                  aria-label="Search guests"
                  className="pl-9 pr-9"
                  data-testid="guest-search"
                />
                {isSearching && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground"
                    data-testid="guest-search-clear"
                  >
                    <Icon name="x" size={13} />
                  </button>
                )}
              </div>
            )}
            <span className="text-xs text-muted" data-testid="guest-count">
              {isSearching
                ? `${visibleGuests.length} of ${guests.length} ${guests.length === 1 ? "guest" : "guests"}`
                : `${guests.length} ${guests.length === 1 ? "guest" : "guests"}`}
            </span>
          </div>
        </div>
        {guests.length === 0 ? (
          <div className="border-t border-border">
            <EmptyState
              compact
              icon="users"
              title="No guests yet"
              description="Add your first guest with the form above, or import a CSV if your plan includes it."
            />
          </div>
        ) : visibleGuests.length === 0 ? (
          <div className="border-t border-border" data-testid="guest-search-empty">
            <EmptyState
              compact
              icon="search"
              title={`No guests match “${searchQuery.trim()}”`}
              description="Search looks at guest names, emails and phone numbers. Check the spelling or try fewer characters."
              action={
                <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              }
            />
          </div>
        ) : (
          <div className="max-h-[32rem] overflow-auto border-t border-border">
            <table className="data-table min-w-[860px]">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Group</th>
                  <th scope="col">RSVP</th>
                  <th scope="col" className="text-right">Attendees</th>
                  <th scope="col" className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleGuests.map((guest) => (
                  <tr key={guest.id}>
                    <td className="font-medium text-heading">{guest.full_name}</td>
                    <td className="text-muted">{guest.email || "—"}</td>
                    <td className="font-mono text-xs text-muted">{guest.phone_number || "—"}</td>
                    <td>
                      {guest.group_name ? (
                        <Badge>{guest.group_name}</Badge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <Badge variant={rsvpVariant(guest.rsvp_status)} dot>
                        {guest.rsvp_status}
                      </Badge>
                      {guest.rsvp_message && (
                        <p className="mt-1 max-w-[14rem] truncate text-xs text-muted" title={guest.rsvp_message}>
                          “{guest.rsvp_message}”
                        </p>
                      )}
                    </td>
                    <td className="text-right tabular-nums" data-testid="guest-attendees">
                      {guest.rsvp_guest_count === null ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span
                          className={guest.rsvp_status === "ACCEPTED" ? "font-semibold text-heading" : "text-muted"}
                          title={
                            guest.rsvp_status === "DECLINED"
                              ? "Declined — not attending"
                              : `${guest.rsvp_guest_count} ${guest.rsvp_guest_count === 1 ? "person" : "people"} including ${guest.full_name}`
                          }
                        >
                          {guest.rsvp_guest_count}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {canUseLinks && (
                          <button
                            onClick={() => downloadGuestPdf(guest)}
                            disabled={pdfGuestId === guest.id}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-secondary transition-colors duration-150 hover:bg-secondary/10 disabled:opacity-50"
                            data-testid="guest-pdf"
                            data-guest-name={guest.full_name}
                          >
                            {pdfGuestId === guest.id ? (
                              <span className="spinner" aria-hidden />
                            ) : (
                              <Icon name="file" size={14} />
                            )}
                            {pdfGuestId === guest.id ? "Preparing…" : "PDF"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(guest)}
                          aria-label={`Edit ${guest.full_name}`}
                          data-tip="Edit"
                          className="tt tt-below inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-secondary/10 hover:text-secondary"
                          data-testid="guest-edit"
                        >
                          <Icon name="edit" size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGuest(guest.id)}
                          aria-label={`Remove ${guest.full_name}`}
                          data-tip="Remove"
                          className="tt tt-below inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-error/10 hover:text-error"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog
        open={editingGuest !== null}
        onClose={closeEdit}
        title="Edit guest"
        description="Changes are saved to this invitation's guest list."
      >
        <form onSubmit={saveEdit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="edit-guest-form" noValidate>
          <div className="sm:col-span-2">
            <Label htmlFor="edit_name">Name *</Label>
            <Input
              id="edit_name"
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              data-state={editErrors.full_name ? "error" : undefined}
              autoFocus
            />
            {editErrors.full_name && <FieldError>{editErrors.full_name}</FieldError>}
          </div>
          <div>
            <Label htmlFor="edit_phone">Phone *</Label>
            <Input
              id="edit_phone"
              type="tel"
              value={editForm.phone_number}
              onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
              data-state={editErrors.phone_number ? "error" : undefined}
              placeholder="+919876543210"
            />
            {editErrors.phone_number && <FieldError>{editErrors.phone_number}</FieldError>}
          </div>
          <div>
            <Label htmlFor="edit_email">Email</Label>
            <Input
              id="edit_email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              data-state={editErrors.email ? "error" : undefined}
              placeholder="guest@example.com"
            />
            {editErrors.email && <FieldError>{editErrors.email}</FieldError>}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="edit_group">Group</Label>
            <Input
              id="edit_group"
              value={editForm.group_name}
              onChange={(e) => setEditForm({ ...editForm, group_name: e.target.value })}
              placeholder="Family, College, Work…"
            />
            {editErrors.group_name && <FieldError>{editErrors.group_name}</FieldError>}
          </div>
          {editErrors.form && (
            <div className="sm:col-span-2">
              <Alert tone="error">{editErrors.form}</Alert>
            </div>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={closeEdit} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSavingEdit} loading={isSavingEdit}>
              {!isSavingEdit && <Icon name="save" size={16} />}
              {isSavingEdit ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Dialog>

      {canSend && (
        <Card className="overflow-hidden p-0" data-testid="send-status-card">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <h2 className="font-heading text-base font-semibold text-heading">Invite Delivery</h2>
            {sendMeta && (
              <p
                className="flex items-center gap-2 text-xs text-muted"
                data-testid="send-status-meta"
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                  {sendMeta.sent} sent
                </span>
                {" · "}
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-error" aria-hidden />
                  {sendMeta.failed} failed
                </span>
                {" · "}
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
                  {sendMeta.pending} pending
                </span>
                {sendMeta.in_flight && isSending ? (
                  <span className="inline-flex items-center gap-1.5 text-secondary">
                    {" · "}
                    <span className="spinner" aria-hidden />
                    sending…
                  </span>
                ) : (
                  ""
                )}
              </p>
            )}
          </div>
          {sendMeta?.in_flight && isSending && (
            <div className="px-5 pb-3">
              <div className="progress-track" />
            </div>
          )}
          {sendRows.length === 0 ? (
            <div className="border-t border-border">
              <EmptyState
                compact
                icon="send"
                title="No delivery attempts yet"
                description="Import a CSV or resend to all guests to start a WhatsApp/SMS send."
              />
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-auto border-t border-border">
              <table className="data-table min-w-[620px]">
                <thead>
                  <tr>
                    <th scope="col">Guest</th>
                    <th scope="col">Number</th>
                    <th scope="col">Channel</th>
                    <th scope="col">Status</th>
                    <th scope="col">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {sendRows.map((row) => (
                    <tr key={row.id} data-testid="send-status-row">
                      <td className="font-medium text-heading">{row.full_name}</td>
                      <td className="font-mono text-xs text-muted">{row.phone_number || "—"}</td>
                      <td className="text-muted">
                        {row.channel === "WHATSAPP"
                          ? "WhatsApp"
                          : row.channel === "SMS"
                            ? "SMS"
                            : "—"}
                      </td>
                      <td>
                        <Badge variant={sendVariant(row.status)} dot>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="text-xs text-muted">{row.error || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default function GuestsPage() {
  return (
    <ProtectedRoute>
      <DashboardShell>
        <GuestsContent />
      </DashboardShell>
    </ProtectedRoute>
  );
}
