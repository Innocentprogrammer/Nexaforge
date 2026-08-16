"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, Badge } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import type { Guest, Invitation, RSVPSummary } from "@/lib/types";

function rsvpVariant(status: Guest["rsvp_status"]) {
  if (status === "ACCEPTED") return "success" as const;
  if (status === "DECLINED") return "error" as const;
  if (status === "MAYBE") return "warning" as const;
  return "default" as const;
}

function GuestsContent() {
  const params = useParams<{ id: string }>();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [summary, setSummary] = useState<RSVPSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [group, setGroup] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const load = async () => {
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
    } catch {
      setError("Could not load guest list.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const addGuest = async (e: FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError(null);
    try {
      const res = await api.post<{ success: boolean; data: Guest }>(
        `/invitations/${params.id}/guests/`,
        { full_name: name, email, phone, group_name: group }
      );
      setGuests((prev) => [...prev, res.data]);
      setName("");
      setEmail("");
      setPhone("");
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

  if (isLoading) return <p className="text-sm text-foreground/60">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary">
            Guests & RSVPs — {invitation?.title}
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Manage your guest list and track responses.
          </p>
        </div>
        <Link href={`/invitations/${params.id}/edit`}>
          <Button variant="outline">Back to Editor</Button>
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

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
            <Input id="g_phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
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

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[500px] text-left text-sm">
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
                  {guest.email || guest.phone || "—"}
                </td>
                <td className="py-3 pr-4 text-foreground/60">{guest.group_name || "—"}</td>
                <td className="py-3 pr-4">
                  <Badge variant={rsvpVariant(guest.rsvp_status)}>{guest.rsvp_status}</Badge>
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => removeGuest(guest.id)}
                    className="text-xs font-medium text-error hover:underline"
                  >
                    Remove
                  </button>
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
