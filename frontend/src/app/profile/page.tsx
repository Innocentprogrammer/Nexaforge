"use client";

import { FormEvent, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Hint } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Icon, type IconName } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

function ProfileContent() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const initial = (user.full_name || user.email).charAt(0).toUpperCase();
  const memberSince = new Date(user.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const planIcon: IconName =
    user.subscription_tier === "DIAMOND"
      ? "diamond"
      : user.subscription_tier === "GOLD"
        ? "crown"
        : "gift";

  const planBlurb =
    user.subscription_tier === "DIAMOND"
      ? "CSV import with automatic WhatsApp/SMS sends, per-guest invite links and personalised PDFs."
      : user.subscription_tier === "GOLD"
        ? "CSV import, per-guest invite links and personalised PDFs. No send channel."
        : "Invitation building, the single public invitation link, and PDF download.";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.patch("/users/me/", { full_name: fullName, phone });
      await refreshUser();
      setSaved(true);
      toast({ title: "Profile updated.", tone: "success" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "NexaInvite", href: "/dashboard" }, { label: "Profile" }]}
        title="Your Profile"
        description="Manage your account details for NexaForge | Invite."
      />

      <Card className="flex flex-wrap items-center gap-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 font-heading text-2xl font-semibold text-secondary ring-1 ring-inset ring-secondary/15">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-lg font-semibold text-heading">
            {user.full_name}
          </p>
          <p className="flex items-center gap-1.5 truncate text-sm text-muted">
            <Icon name="mail" size={14} />
            {user.email}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={user.is_verified ? "success" : "warning"} dot>
              {user.is_verified ? "Verified" : "Unverified"}
            </Badge>
            <Badge>{user.role}</Badge>
            <Badge
              variant={
                user.subscription_tier === "DIAMOND"
                  ? "success"
                  : user.subscription_tier === "GOLD"
                    ? "warning"
                    : "default"
              }
              data-testid="profile-plan-badge"
            >
              {user.subscription_tier} plan
            </Badge>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Account details" description="Your name and contact number." />
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled />
            <Hint>Email cannot be changed.</Hint>
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Add a phone number"
            />
          </div>

          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            {saved && !error && (
              <span className="animate-scale-in flex items-center gap-1.5 text-sm font-medium text-success">
                <Icon name="check-circle" size={14} />
                Profile updated.
              </span>
            )}
            <Button type="submit" variant="primary" disabled={isSaving} loading={isSaving}>
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Account info" description="Read-only details about this account." />
        <dl className="mt-5 divide-y divide-border">
          <div className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
            <dt className="flex items-center gap-2 text-sm text-muted">
              <Icon name="calendar" size={14} />
              Member since
            </dt>
            <dd className="text-sm font-medium text-foreground">{memberSince}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 py-3">
            <dt className="flex items-center gap-2 text-sm text-muted">
              <Icon name="user" size={14} />
              Account type
            </dt>
            <dd className="text-sm font-medium text-foreground">{user.role}</dd>
          </div>
          <div className="py-3 last:pb-0">
            <dt className="flex items-center gap-2 text-sm text-muted">
              <Icon name={planIcon} size={14} />
              Subscription plan
            </dt>
            <dd className="mt-2 rounded-xl border border-border bg-background-subtle p-4">
              <p className="font-heading text-sm font-semibold text-heading">
                {user.subscription_tier}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">{planBlurb}</p>
              <p className="mt-2 text-xs text-muted/80">
                Billing isn&apos;t built yet — plan changes are made by an administrator.
              </p>
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <DashboardShell>
        <ProfileContent />
      </DashboardShell>
    </ProtectedRoute>
  );
}
