/**
 * The host's plan. Tiers are cumulative — DIAMOND unlocks everything GOLD does.
 * Lives on the account, not on individual guests: use `hasTier()` rather than
 * comparing strings, so "diamond includes gold" stays true everywhere.
 */
export type SubscriptionTier = "NORMAL" | "GOLD" | "DIAMOND";

const TIER_RANK: Record<SubscriptionTier, number> = {
  NORMAL: 0,
  GOLD: 1,
  DIAMOND: 2,
};

/** Mirrors accounts.models.tier_at_least on the backend. */
export function hasTier(
  tier: SubscriptionTier | undefined | null,
  minimum: SubscriptionTier
): boolean {
  return TIER_RANK[tier ?? "NORMAL"] >= TIER_RANK[minimum];
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  /** Read-only; updated by verified subscription payments or authorized admin actions. */
  subscription_tier: SubscriptionTier;
  is_verified: boolean;
  /** Django staff flag; backend authorization remains authoritative. */
  is_staff?: boolean;
  profile_image: string | null;
  created_at: string;
}

export interface TemplateJson {
  background_color?: string;
  background_color_2?: string;
  /** Text color for heading/subheading/message — independent of accent_color. */
  font_color?: string;
  /** Decorative color for borders, dividers, and pattern accents (not text). */
  accent_color?: string;
  heading_font?: string;
  body_font?: string;
  /** Decorative motif key — see PATTERNS in components/invitation-canvas.tsx. */
  pattern?: string;
  image_url?: string;
  heading?: string;
  subheading?: string;
  message?: string;
  [key: string]: unknown;
}

export interface InvitationTemplate {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  preview_image: string;
  template_json: TemplateJson;
  premium: boolean;
  price: string;
  active: boolean;
  created_at: string;
}

export interface Invitation {
  id: string;
  template: string;
  template_detail: InvitationTemplate;
  title: string;
  slug: string;
  event_type: string;
  event_date: string | null;
  venue: string;
  invitation_json: TemplateJson;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  qr_code: string;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  invitation: string;
  full_name: string;
  email: string;
  /** E.164, e.g. +919876543210. Blank when unknown. */
  phone_number: string;
  group_name: string;
  unique_token: string;
  /** `${FRONTEND_URL}/invite/${unique_token}` */
  unique_invite_url: string;
  invite_opened_at: string | null;
  invitation_sent: boolean;
  rsvp_status: "PENDING" | "ACCEPTED" | "DECLINED" | "MAYBE";
  /** Attendees on the guest's RSVP, them included. 0 if declined; null if no reply yet. */
  rsvp_guest_count: number | null;
  rsvp_message: string;
  rsvp_responded_at: string | null;
  created_at: string;
}

export type SendStatus = "PENDING" | "SENT" | "FAILED";

/** One row of GET /invitations/{id}/guests/send-status/ */
export interface GuestSendStatus {
  id: string;
  full_name: string;
  phone_number: string;
  /** Blank until the task has attempted this guest. */
  channel: "" | "WHATSAPP" | "SMS";
  status: SendStatus;
  error: string;
  email: string;
  /** Blank when no email was attempted (the guest has no address). */
  email_status: "" | SendStatus;
  email_error: string;
  last_attempt_at: string | null;
}

export interface SendStatusMeta {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  in_flight: boolean;
}

/** A row the Diamond import collapsed onto an earlier row with the same number. */
export interface ImportDuplicate {
  full_name: string;
  phone_number: string;
  /** Name of the guest (existing, or earlier in the file) this row duplicated. */
  collapsed_onto: string;
  reason: string;
}

/** A row excluded from the send batch by the 10-digit Indian number pre-check. */
export interface ImportRejection {
  full_name: string;
  /** The value as typed in the CSV, not normalised. */
  phone_number: string;
  reason: string;
}

/**
 * `meta` of POST /guests/import/. Diamond imports send on upload with no
 * confirmation step, so this summary is the host's only record of what a bad
 * file did — show all of it.
 */
export interface ImportSummary {
  imported: number;
  queued_for_send: number;
  duplicates_collapsed: number;
  invalid_numbers: number;
  /** Rows with no name at all, skipped entirely. */
  skipped_rows: number;
  duplicates: ImportDuplicate[];
  rejected: ImportRejection[];
  /** True when this host's plan sends automatically on import (Diamond). */
  auto_send: boolean;
  task_id: string | null;
}

export interface RSVPSummary {
  total_guests: number;
  responded: number;
  accepted: number;
  declined: number;
  maybe: number;
  pending: number;
  /** Head count from ACCEPTED RSVPs (guests plus the people they bring). */
  expected_attendance: number;
  /** Head count from MAYBE RSVPs. */
  maybe_attendance: number;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  legacy_tagline: string;
  legacy_description: string;
  status: "OPERATIONAL" | "BETA" | "COMING_SOON";
  icon_key: string;
  href: string;
  order: number;
  features: string[];
  target_audience: string[];
  highlights: string[];
}

export interface MediaAsset {
  id: string;
  title: string;
  file: string;
  url: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
  created_at: string;
}

export interface LeadPayload {
  full_name?: string;
  email: string;
  company?: string;
  message?: string;
  source: "CONTACT_PAGE" | "NEWSLETTER" | "CONSULTATION";
}
