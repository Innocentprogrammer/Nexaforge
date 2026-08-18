"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { InvitationCanvas } from "@/components/invitation-canvas";
import { api, ApiError } from "@/lib/api";
import type { Invitation } from "@/lib/types";

export type PublicInvitation = Pick<
  Invitation,
  "id" | "title" | "slug" | "event_type" | "event_date" | "venue" | "invitation_json"
> & { template_detail: Invitation["template_detail"] };

/** Present only when the page was reached through a guest's unique invite link. */
export interface PublicInvitationGuest {
  id: string;
  full_name: string;
}

/**
 * The rendered public invitation + RSVP form, shared by `/i/[slug]` (open link)
 * and `/invite/[token]` (a specific guest's unique link). Extracted from
 * `/i/[slug]` unchanged so the two routes can't drift apart — same markup, same
 * classes, same behaviour; the only difference is that a known `guest` prefills
 * the name and attributes the RSVP instead of creating a new guest row.
 *
 * `greetingName` adds the "Hi {name}, you're invited" line above the card for
 * Gold/Diamond hosts. It is opt-in per call site and the caller decides when to
 * pass it — `/i/[slug]` never does, so the anonymous self-registration link
 * keeps showing no name at all.
 */
export function PublicInvitationView({
  invitation,
  guest,
  greetingName,
}: {
  invitation: PublicInvitation;
  guest?: PublicInvitationGuest | null;
  greetingName?: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(guest?.full_name || "");
  const [phone, setPhone] = useState("");
  const [response, setResponse] = useState<"ACCEPTED" | "DECLINED" | "MAYBE">("ACCEPTED");
  const [guestCount, setGuestCount] = useState(1);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRsvp = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post(
        "/rsvp/",
        {
          invitation_slug: invitation.slug,
          // Attributes the RSVP to the invited guest rather than creating a new
          // one. Omitted entirely for the open /i/[slug] link, which keeps its
          // existing self-registration behaviour.
          ...(guest ? { guest_id: guest.id } : {}),
          full_name: name,
          phone,
          response,
          guest_count: guestCount,
          message,
        },
        { auth: false }
      );
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit RSVP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const json = invitation.invitation_json;
  const bg1 = String(json.background_color || "#f8fafc");
  const bg2 = String(json.background_color_2 || bg1);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-16"
      style={{ background: `linear-gradient(160deg, ${bg1} 0%, ${bg2} 100%)` }}
    >
      {greetingName && (
        <div className="mb-6 w-full max-w-2xl text-center" data-testid="guest-greeting">
          <p
            className="font-heading text-2xl font-semibold sm:text-3xl"
            style={{ color: String(json.font_color || json.accent_color || "#1a1a2e") }}
          >
            Hi {greetingName}, you&apos;re invited
          </p>
        </div>
      )}

      <div className="w-full max-w-2xl drop-shadow-2xl">
        <InvitationCanvas
          data={{ ...json, title: invitation.title, venue: invitation.venue, eventDate: invitation.event_date }}
          size="full"
        />
      </div>

      <div className="mt-10 w-full max-w-md">
        {submitted ? (
          <Card>
            <p className="font-heading text-lg font-semibold text-primary">Thank you!</p>
            <p className="mt-1 text-sm text-foreground/60">Your RSVP has been recorded.</p>
          </Card>
        ) : showForm ? (
          <Card className="text-left">
            <h2 className="font-heading text-lg font-semibold text-primary">RSVP</h2>
            <form onSubmit={submitRsvp} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="rsvp_name">Your name</Label>
                <Input id="rsvp_name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="rsvp_phone">Phone (optional)</Label>
                <Input id="rsvp_phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rsvp_response">Will you attend?</Label>
                <select
                  id="rsvp_response"
                  value={response}
                  onChange={(e) => setResponse(e.target.value as typeof response)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="ACCEPTED">Yes, I&apos;ll be there</option>
                  <option value="MAYBE">Maybe</option>
                  <option value="DECLINED">Can&apos;t make it</option>
                </select>
              </div>
              <div>
                <Label htmlFor="rsvp_count">Number of guests</Label>
                <Input
                  id="rsvp_count"
                  type="number"
                  min={1}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="rsvp_message">Message (optional)</Label>
                <Input id="rsvp_message" value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting…" : "Submit RSVP"}
              </Button>
            </form>
          </Card>
        ) : (
          <Button variant="primary" className="px-8 py-3 text-base" onClick={() => setShowForm(true)}>
            RSVP Now
          </Button>
        )}
      </div>
    </div>
  );
}

export function PublicInvitationLoading() {
  return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
}

export function PublicInvitationNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center text-foreground/60">
      This invitation could not be found.
    </div>
  );
}
