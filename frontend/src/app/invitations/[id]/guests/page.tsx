"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, Badge } from "@/components/ui/card";
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

function sendVariant(status: GuestSendStatus["status"]) {
  if (status === "SENT") return "success" as const;
  if (status === "FAILED") return "error" as const;
  return "warning" as const;
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

  if (isLoading) return <p className="text-sm text-foreground/60">Loading…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary">
            Guests &amp; RSVPs — {invitation?.title}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-foreground/60">
            Manage your guest list and track responses.
            <Badge
              variant={canSend ? "success" : canUseLinks ? "warning" : "default"}
              data-testid="plan-badge"
            >
              {tier} plan
            </Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadInvitationPdf} data-testid="download-pdf">
            Download PDF
          </Button>
          {canUseLinks && guests.length > 0 && (
            <Button
              variant="outline"
              onClick={exportInviteLinks}
              disabled={isExporting}
              data-testid="export-invite-links"
            >
              {isExporting ? "Exporting…" : `Export Invite Links (${guests.length})`}
            </Button>
          )}
          {canSend && guests.length > 0 && (
            <Button
              variant="primary"
              onClick={resendInvites}
              disabled={isSending}
              data-testid="resend-invites"
            >
              {isSending ? "Sending…" : `Resend to All Guests (${guests.length})`}
            </Button>
          )}
          <Link href={`/invitations/${params.id}/edit`}>
            <Button variant="outline">Back to Editor</Button>
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-error">{error}</p>}
      {notice && (
        <p className="mt-4 text-sm text-success" data-testid="guest-notice">
          {notice}
        </p>
      )}

      {summary && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Card className="p-4 text-center">
            <p className="text-xs text-foreground/50">Total Guests</p>
            <p className="mt-1 text-xl font-semibold text-primary">{summary.total_guests}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-foreground/50">Accepted</p>
            <p className="mt-1 text-xl font-semibold text-success">{summary.accepted}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-foreground/50">Declined</p>
            <p className="mt-1 text-xl font-semibold text-error">{summary.declined}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-foreground/50">Maybe</p>
            <p className="mt-1 text-xl font-semibold text-warning">{summary.maybe}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-foreground/50">Pending</p>
            <p className="mt-1 text-xl font-semibold text-foreground/70">{summary.pending}</p>
          </Card>
        </div>
      )}

      <Card className="mt-8">
        <h2 className="font-heading text-base font-semibold text-primary">Add Guest</h2>
        <form onSubmit={addGuest} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="g_email">Email</Label>
            <Input id="g_email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="g_phone">Phone</Label>
            <Input
              id="g_phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+919876543210"
            />
          </div>
          <div>
            <Label htmlFor="g_group">Group</Label>
            <Input id="g_group" value={group} onChange={(e) => setGroup(e.target.value)} />
          </div>
          <div className="sm:col-span-5">
            <Button type="submit" variant="primary" disabled={isAdding}>
              {isAdding ? "Adding…" : "Add Guest"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <h2 className="font-heading text-base font-semibold text-primary">
          Import Guests from CSV
        </h2>
        <p className="mt-1 text-sm text-foreground/60">
          Columns: <code className="font-mono text-xs">full_name, email, phone_number, group_name</code>.
        </p>
        {canSend ? (
          <p
            className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground/80"
            data-testid="auto-send-warning"
          >
            <strong>Invites are sent automatically on import.</strong>{" "}
            Every valid number in
            the file receives a WhatsApp or SMS message as soon as the upload finishes — there
            is no confirmation step, so re-uploading a file sends to it again. Duplicate
            numbers within one file are sent to once, and numbers that aren&apos;t 10-digit
            Indian numbers are not sent at all; both are listed in the summary below.
          </p>
        ) : canUseLinks ? (
          <p className="mt-3 text-sm text-foreground/60">
            Imported guests each get a unique invite link and a personalised PDF. Your plan
            has no send channel — hand the links out yourself.
          </p>
        ) : (
          <p
            className="mt-3 rounded-lg border border-border bg-background-subtle px-3 py-2 text-sm text-foreground/70"
            data-testid="import-locked-note"
          >
            CSV import is a Gold plan feature. Your account is on the Normal plan — add guests
            with the form above, or share the single public invitation link.
          </p>
        )}
        <form onSubmit={importGuests} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="csv_file">CSV file</Label>
            <input
              id="csv_file"
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:text-primary"
              data-testid="csv-file-input"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={isImporting || !importFile}
            data-testid="import-guests"
          >
            {isImporting ? "Importing…" : canSend ? "Import & Send Invites" : "Import Guests"}
          </Button>
        </form>
        {importError && (
          <p className="mt-3 text-sm text-error" data-testid="import-error">
            {importError}
          </p>
        )}
      </Card>

      {importSummary && (
        <Card className="mt-6" data-testid="import-summary">
          <h2 className="font-heading text-base font-semibold text-primary">Import Summary</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-xs text-foreground/50">Imported</p>
              <p className="mt-1 text-xl font-semibold text-primary" data-testid="summary-imported">
                {importSummary.imported}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-foreground/50">Sent</p>
              <p className="mt-1 text-xl font-semibold text-success" data-testid="summary-sent">
                {importSummary.queued_for_send}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-foreground/50">Duplicates collapsed</p>
              <p
                className="mt-1 text-xl font-semibold text-warning"
                data-testid="summary-duplicates"
              >
                {importSummary.duplicates_collapsed}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-foreground/50">Rejected format</p>
              <p className="mt-1 text-xl font-semibold text-error" data-testid="summary-rejected">
                {importSummary.invalid_numbers}
              </p>
            </div>
          </div>

          {importSummary.duplicates.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-foreground/80">
                Collapsed duplicates — sent once
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-foreground/70">
                {importSummary.duplicates.map((dup, i) => (
                  <li key={i} data-testid="summary-duplicate-row">
                    <span className="font-medium">{dup.full_name}</span>{" "}
                    <span className="font-mono text-xs">{dup.phone_number}</span> — same number
                    as <span className="font-medium">{dup.collapsed_onto}</span>, who received
                    the single message.
                  </li>
                ))}
              </ul>
            </div>
          )}

          {importSummary.rejected.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-foreground/80">
                Not sent — invalid number format
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-foreground/70">
                {importSummary.rejected.map((row, i) => (
                  <li key={i} data-testid="summary-rejected-row">
                    <span className="font-medium">{row.full_name}</span>{" "}
                    <span className="font-mono text-xs">{row.phone_number || "(blank)"}</span> —
                    expected a 10-digit Indian number. The guest was still added; fix the number
                    and resend.
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-foreground/50">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Contact</th>
              <th className="py-2 pr-4">Group</th>
              <th className="py-2 pr-4">RSVP</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-medium">{guest.full_name}</td>
                <td className="py-3 pr-4 text-foreground/60">
                  {guest.email || guest.phone_number || "—"}
                </td>
                <td className="py-3 pr-4 text-foreground/60">{guest.group_name || "—"}</td>
                <td className="py-3 pr-4">
                  <Badge variant={rsvpVariant(guest.rsvp_status)}>{guest.rsvp_status}</Badge>
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {canUseLinks && (
                      <button
                        onClick={() => downloadGuestPdf(guest)}
                        disabled={pdfGuestId === guest.id}
                        className="text-xs font-medium text-secondary hover:underline disabled:opacity-50"
                        data-testid="guest-pdf"
                        data-guest-name={guest.full_name}
                      >
                        {pdfGuestId === guest.id ? "Preparing…" : "PDF"}
                      </button>
                    )}
                    <button
                      onClick={() => removeGuest(guest.id)}
                      className="text-xs font-medium text-error hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {guests.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-foreground/50">
                  No guests yet — add your first guest above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {canSend && (
        <Card className="mt-6 overflow-x-auto" data-testid="send-status-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-base font-semibold text-primary">
              Invite Delivery
            </h2>
            {sendMeta && (
              <p className="text-xs text-foreground/60" data-testid="send-status-meta">
                {sendMeta.sent} sent · {sendMeta.failed} failed · {sendMeta.pending} pending
                {sendMeta.in_flight && isSending ? " · sending…" : ""}
              </p>
            )}
          </div>
          <table className="mt-4 w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-foreground/50">
                <th className="py-2 pr-4">Guest</th>
                <th className="py-2 pr-4">Number</th>
                <th className="py-2 pr-4">Channel</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {sendRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0"
                  data-testid="send-status-row"
                >
                  <td className="py-3 pr-4 font-medium">{row.full_name}</td>
                  <td className="py-3 pr-4 text-foreground/60">{row.phone_number || "—"}</td>
                  <td className="py-3 pr-4 text-foreground/60">
                    {row.channel === "WHATSAPP"
                      ? "WhatsApp"
                      : row.channel === "SMS"
                        ? "SMS"
                        : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={sendVariant(row.status)}>{row.status}</Badge>
                  </td>
                  <td className="py-3 text-xs text-foreground/60">{row.error || "—"}</td>
                </tr>
              ))}
              {sendRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-foreground/50">
                    No delivery attempts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
