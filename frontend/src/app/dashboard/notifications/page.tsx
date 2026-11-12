"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { api, ApiError } from "@/lib/api";

type NotificationItem = {
  id: string;
  category: "ACCOUNT" | "INVITATION" | "RSVP" | "BILLING" | "SYSTEM";
  title: string;
  message: string;
  action_url: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  email_status: "NOT_REQUESTED" | "PENDING" | "SENT" | "FAILED" | "SKIPPED";
  created_at: string;
};

type NotificationPreferences = {
  email_enabled: boolean;
  email_account: boolean;
  email_invitations: boolean;
  email_rsvp: boolean;
  email_billing: boolean;
};

type ListResponse = { count: number; results: NotificationItem[] };

const CATEGORY_LABEL: Record<NotificationItem["category"], string> = {
  ACCOUNT: "Account", INVITATION: "Invitation", RSVP: "RSVP", BILLING: "Billing", SYSTEM: "System",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function NotificationsContent() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [list, prefs] = await Promise.all([
        api.get<ListResponse>("/notifications/?page_size=50"),
        api.get<{ success: boolean; data: NotificationPreferences }>("/notifications/preferences/"),
      ]);
      setItems(list.results ?? []);
      setPreferences(prefs.data);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read/`, {});
      setItems((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not update notification.");
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all/", {});
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
      setSuccess("All notifications marked as read.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not update notifications.");
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;
    setSaving(true);
    setError("");
    try {
      const response = await api.patch<{ success: boolean; data: NotificationPreferences }>(
        "/notifications/preferences/", { [key]: value }
      );
      setPreferences(response.data);
      setSuccess("Notification preferences saved.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const unread = items.filter((item) => !item.is_read).length;

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: "NexaInvite", href: "/dashboard" }, { label: "Notifications" }]}
        title="Notifications"
        description="Stay up to date with invitations, RSVPs and billing activity."
        actions={<Button variant="outline" onClick={markAllRead} disabled={unread === 0}><Icon name="check" size={15} />Mark all as read</Button>}
      />

      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-heading">Recent activity</h2>
            <Badge variant={unread ? "brand" : "default"}>{unread} unread</Badge>
          </div>
          {loading ? <Skeleton className="h-48 rounded-xl" /> : items.length === 0 ? (
            <Card className="py-12 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted"><Icon name="bell" size={22} /></span>
              <h3 className="mt-4 font-heading font-semibold text-heading">You're all caught up</h3>
              <p className="mt-1 text-sm text-muted">New account, invitation, RSVP and billing updates will appear here.</p>
            </Card>
          ) : items.map((item) => (
            <Card key={item.id} className={item.is_read ? "opacity-80" : "border-secondary/30"}>
              <div className="flex items-start gap-3">
                <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.is_read ? "bg-surface-2 text-muted" : "bg-secondary/10 text-secondary"}`}>
                  <Icon name={item.category === "RSVP" ? "users" : item.category === "BILLING" ? "card" : item.category === "INVITATION" ? "mail" : "bell"} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-heading">{item.title}</h3>
                    {!item.is_read && <Badge variant="brand" dot>New</Badge>}
                    <Badge>{CATEGORY_LABEL[item.category]}</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted">{item.message}</p>
                  <p className="mt-2 text-xs text-muted">{formatDate(item.created_at)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {item.action_url && <Link href={item.action_url} className="text-sm font-medium text-secondary hover:underline">View details <span aria-hidden>→</span></Link>}
                    {!item.is_read && <button onClick={() => void markRead(item.id)} className="text-sm text-muted hover:text-heading">Mark as read</button>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </section>

        <aside className="space-y-3">
          <Card>
            <div className="flex items-center gap-2"><Icon name="mail" size={18} /><h2 className="font-heading font-semibold text-heading">Email preferences</h2></div>
            <p className="mt-2 text-sm text-muted">In-app notifications remain available even when email updates are disabled.</p>
            {preferences && <div className="mt-5 space-y-4">
              {([
                ["email_enabled", "Email notifications", "Master email preference"],
                ["email_account", "Account updates", "Welcome and account activity"],
                ["email_invitations", "Invitation updates", "Publishing and delivery reports"],
                ["email_rsvp", "RSVP updates", "Guest responses"],
                ["email_billing", "Billing updates", "Payments and subscription expiry"],
              ] as [keyof NotificationPreferences, string, string][]).map(([key, label, hint]) => (
                <label key={key} className="flex cursor-pointer items-start justify-between gap-3">
                  <span><span className="block text-sm font-medium text-heading">{label}</span><span className="mt-0.5 block text-xs text-muted">{hint}</span></span>
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    disabled={saving || (key !== "email_enabled" && !preferences.email_enabled)}
                    onChange={(event) => void updatePreference(key, event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[var(--secondary)]"
                  />
                </label>
              ))}
            </div>}
            {loading && <Skeleton className="mt-5 h-32" />}
          </Card>
          <Card className="bg-surface-2/60">
            <h3 className="text-sm font-semibold text-heading">Need to manage your plan?</h3>
            <p className="mt-1 text-sm text-muted">View your active plan and payment history.</p>
            <Link href="/dashboard/billing"><Button variant="outline" className="mt-4 w-full">Open billing</Button></Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return <ProtectedRoute><DashboardShell><NotificationsContent /></DashboardShell></ProtectedRoute>;
}
