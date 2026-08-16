"use client";

import { FormEvent, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

function ProfileContent() {
  const { user, refreshUser } = useAuth();
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.patch("/users/me/", { full_name: fullName, phone });
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl font-semibold text-primary">Your Profile</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Manage your account details for NexaForge | Invite.
      </p>

      <Card className="mt-8 flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10 font-heading text-xl font-semibold text-secondary">
          {initial}
        </span>
        <div>
          <p className="font-heading text-lg font-semibold text-primary">{user.full_name}</p>
          <p className="text-sm text-foreground/60">{user.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={user.is_verified ? "success" : "warning"}>
              {user.is_verified ? "Verified" : "Unverified"}
            </Badge>
            <Badge>{user.role}</Badge>
          </div>
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="font-heading text-base font-semibold text-primary">Account details</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
            <p className="mt-1 text-xs text-foreground/50">Email cannot be changed.</p>
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

          {error && <p className="text-sm text-error">{error}</p>}
          {saved && <p className="text-sm text-success">Profile updated.</p>}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <h2 className="font-heading text-base font-semibold text-primary">Account info</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Member since
            </dt>
            <dd className="mt-1 text-sm text-foreground/70">{memberSince}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Account type
            </dt>
            <dd className="mt-1 text-sm text-foreground/70">{user.role}</dd>
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
