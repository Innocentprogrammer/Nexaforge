"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
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
  /** The guest's existing RSVP, if they've already responded via their link. */
  rsvp?: SavedRsvp | null;
}

type RsvpResponse = "ACCEPTED" | "DECLINED" | "MAYBE";

interface SavedRsvp {
  response: RsvpResponse;
  guest_count: number;
  message?: string;
  responded_at?: string;
}

const RESPONSE_LABEL: Record<RsvpResponse, string> = {
  ACCEPTED: "Attending",
  MAYBE: "Maybe",
  DECLINED: "Not attending",
};

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
 *
 * Deliberately carries no NexaForge/NexaInvite chrome: the guest is looking at
 * the host's invitation, so the card is the only thing with any weight on the
 * page. The RSVP panel is a frosted sheet over the host's own background.
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
  const [response, setResponse] = useState<RsvpResponse>("ACCEPTED");
  const [guestCount, setGuestCount] = useState(1);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // A guest on their personal link: the RSVP they've already given (from an
  // earlier visit, or just now). While set, the page shows it with a
  // "Change my RSVP" button instead of "RSVP Now".
  const [savedRsvp, setSavedRsvp] = useState<SavedRsvp | null>(guest?.rsvp ?? null);
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startChange = () => {
    if (savedRsvp) {
      setResponse(savedRsvp.response);
      setGuestCount(savedRsvp.guest_count || 1);
      setMessage(savedRsvp.message ?? "");
    }
    setError(null);
    setIsChanging(true);
    setShowForm(true);
  };

  const cancelChange = () => {
    setIsChanging(false);
    setShowForm(false);
    setError(null);
  };

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
      if (guest) {
        setSavedRsvp({ response, guest_count: guestCount, message });
        setShowForm(false);
        setIsChanging(false);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit RSVP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const json = invitation.invitation_json;
  const bg1 = String(json.background_color || "#f8fafc");
  const bg2 = String(json.background_color_2 || bg1);
  const inkColor = String(json.font_color || json.accent_color || "#1a1a2e");

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-5 py-14 sm:px-6 sm:py-16"
      style={{ background: `linear-gradient(160deg, ${bg1} 0%, ${bg2} 100%)` }}
    >
      {greetingName && (
        <div className="animate-fade-in-up mb-7 w-full max-w-2xl text-center" data-testid="guest-greeting">
          <p
            className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ color: inkColor }}
          >
            Hi {greetingName}, you&apos;re invited
          </p>
        </div>
      )}

      <div
        className="animate-sheet-in w-full max-w-2xl overflow-hidden rounded-2xl drop-shadow-2xl"
        style={{ animationDelay: "60ms" }}
      >
        <InvitationCanvas
          data={{ ...json, title: invitation.title, venue: invitation.venue, eventDate: invitation.event_date }}
          size="full"
        />
      </div>

      <div className="mt-10 w-full max-w-md">
        {guest && savedRsvp && !showForm ? (
          <div
            className="animate-scale-in glass-strong rounded-2xl border border-white/40 p-7 text-center shadow-xl"
            data-testid="rsvp-already-submitted"
          >
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success/12 text-success">
              <Icon name="check-circle" size={24} />
            </span>
            <p className="mt-4 font-heading text-lg font-semibold text-heading">
              {submitted ? "Thank you! Your RSVP has been saved." : "You\u2019ve already submitted your RSVP"}
            </p>
            <p className="mt-1.5 text-sm text-muted">
              Your response: {RESPONSE_LABEL[savedRsvp.response]}
              {savedRsvp.response !== "DECLINED" &&
                ` · ${savedRsvp.guest_count} ${savedRsvp.guest_count === 1 ? "guest" : "guests"}`}
            </p>
            <div className="mt-5 flex justify-center">
              <Button variant="outline" onClick={startChange} data-testid="rsvp-change">
                <Icon name="refresh" size={16} />
                Change my RSVP
              </Button>
            </div>
          </div>
        ) : submitted ? (
          <div className="animate-scale-in glass-strong rounded-2xl border border-white/40 p-7 text-center shadow-xl">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success/12 text-success">
              <Icon name="check-circle" size={24} />
            </span>
            <p className="mt-4 font-heading text-lg font-semibold text-heading">Thank you!</p>
            <p className="mt-1.5 text-sm text-muted">Your RSVP has been recorded.</p>
          </div>
        ) : showForm ? (
          <div className="animate-sheet-in glass-strong rounded-2xl border border-white/40 p-6 text-left shadow-xl sm:p-7">
            <h2 className="font-heading text-lg font-semibold text-heading">
              {isChanging ? "Change your RSVP" : "RSVP"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {isChanging
                ? "Update your reply — the host will see your latest answer."
                : "A few details and you\u2019re done."}
            </p>
            <form onSubmit={submitRsvp} className="mt-6 space-y-4">
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
                <Select
                  id="rsvp_response"
                  value={response}
                  onChange={(e) => setResponse(e.target.value as typeof response)}
                >
                  <option value="ACCEPTED">Yes, I&apos;ll be there</option>
                  <option value="MAYBE">Maybe</option>
                  <option value="DECLINED">Can&apos;t make it</option>
                </Select>
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
                <Input
                  id="rsvp_message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Say something to the host"
                />
              </div>
              {error && <Alert tone="error">{error}</Alert>}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                {isSubmitting ? "Submitting…" : isChanging ? "Update RSVP" : "Submit RSVP"}
              </Button>
              {isChanging && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={cancelChange}
                  disabled={isSubmitting}
                >
                  Keep my current RSVP
                </Button>
              )}
            </form>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button variant="primary" size="lg" className="px-9" onClick={() => setShowForm(true)}>
              <Icon name="message" size={18} />
              RSVP Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PublicInvitationLoading() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 bg-canvas px-5 py-16"
      role="status"
      aria-label="Loading invitation"
    >
      <Skeleton className="h-[26rem] w-full max-w-2xl rounded-2xl" />
      <Skeleton className="h-11 w-40 rounded-xl" />
    </div>
  );
}

export function PublicInvitationNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background text-muted shadow-sm">
        <Icon name="inbox" size={24} />
      </span>
      <p className="mt-5 font-heading text-lg font-semibold text-heading">
        This invitation could not be found.
      </p>
      <p className="mt-1.5 max-w-sm text-sm text-muted">
        The link may have expired, or the host may have unpublished it. Ask them for an updated
        link.
      </p>
    </div>
  );
}
