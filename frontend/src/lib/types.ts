export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_verified: boolean;
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
  phone: string;
  group_name: string;
  invitation_sent: boolean;
  rsvp_status: "PENDING" | "ACCEPTED" | "DECLINED" | "MAYBE";
  created_at: string;
}

export interface RSVPSummary {
  total_guests: number;
  responded: number;
  accepted: number;
  declined: number;
  maybe: number;
  pending: number;
  expected_attendance: number;
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
  status: "OPERATIONAL" | "BETA" | "COMING_SOON";
  icon_key: string;
  href: string;
  order: number;
}

export interface LeadPayload {
  full_name?: string;
  email: string;
  company?: string;
  message?: string;
  source: "CONTACT_PAGE" | "NEWSLETTER" | "CONSULTATION";
}
