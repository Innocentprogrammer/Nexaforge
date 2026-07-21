"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { InvitationCanvas } from "@/components/invitation-canvas";
import { api, ApiError } from "@/lib/api";
import type { Invitation } from "@/lib/types";

type PublicInvitation = Pick<
  Invitation,
  "id" | "title" | "slug" | "event_type" | "event_date" | "venue" | "invitation_json"
> & { template_detail: Invitation["template_detail"] };

export default function PublicInvitationPage() {
  const params = useParams<{ slug: string }>();
  const [invitation, setInvitation] = useState<PublicInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [response, setResponse] = useState<"ACCEPTED" | "DECLINED" | "MAYBE">("ACCEPTED");
  const [guestCount, setGuestCount] = useState(1);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ success: boolean; data: PublicInvitation }>(`/public/invitations/${params.slug}/`, {
        auth: false,
      })
      .then((res) => setInvitation(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [params.slug]);

  const submitRsvp = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post(
        "/rsvp/",
        {
          invitation_slug: params.slug,
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

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  }

  if (notFound || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center text-foreground/60">
        This invitation could not be found.
      </div>
    );
  }

  const json = invitation.invitation_json;
  const bg1 = String(json.background_color || "#f8fafc");
  const bg2 = String(json.background_color_2 || bg1);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-16"
      style={{ background: `linear-gradient(160deg, ${bg1} 0%, ${bg2} 100%)` }}
    >
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
