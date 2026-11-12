"use client";

import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { InvitationCanvas } from "@/components/invitation-canvas";

const STATS = [
  { label: "Invitation templates", value: "12+" },
  { label: "To start", value: "Free" },
  { label: "App download needed", value: "None" },
  { label: "RSVP tracking", value: "Real-time" },
];

const FEATURES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "sparkles",
    title: "Beautiful Templates",
    description: "Pick from wedding, birthday, anniversary, corporate, and religious designs.",
  },
  {
    icon: "edit",
    title: "Easy Customization",
    description: "Edit text, colors, fonts, and event details with a live preview — no design skills.",
  },
  {
    icon: "users",
    title: "Guest & RSVP Tracking",
    description: "Manage your guest list and watch RSVPs roll in, all from one dashboard.",
  },
  {
    icon: "send",
    title: "Instant Sharing",
    description: "Share a link or QR code — guests need zero app downloads to respond.",
  },
  {
    icon: "palette",
    title: "Rich Visual Patterns",
    description: "Frames, dots, sparkle, confetti, and floral motifs bring every card to life.",
  },
  {
    icon: "clock",
    title: "Autosave, Always",
    description: "Your invitation saves itself as you edit — publish whenever you're ready.",
  },
];

const WORKFLOW = [
  { step: "1", title: "Choose a template", description: "Browse the gallery, filtered by event type." },
  { step: "2", title: "Customize", description: "Edit event details, headline, fonts and colors with a live preview." },
  { step: "3", title: "Publish", description: "Get a shareable link and QR code instantly." },
  { step: "4", title: "Track RSVPs", description: "Watch responses arrive on your owner dashboard." },
];

const SHOWCASE = [
  {
    label: "Wedding",
    data: {
      heading: "Sarah & James",
      subheading: "are getting married",
      background_color: "#fdf2f8",
      background_color_2: "#fce7f3",
      font_color: "#831843",
      accent_color: "#db2777",
      heading_font: "playfair",
      pattern: "frame",
    },
  },
  {
    label: "Birthday",
    data: {
      heading: "Turning 30!",
      subheading: "Join the celebration",
      background_color: "#fffbeb",
      background_color_2: "#fef3c7",
      font_color: "#78350f",
      accent_color: "#f59e0b",
      heading_font: "dancing",
      pattern: "confetti",
    },
  },
  {
    label: "Corporate",
    data: {
      heading: "Annual Summit 2026",
      subheading: "NexaForge Technologies",
      background_color: "#eff6ff",
      background_color_2: "#dbeafe",
      font_color: "#1e3a8a",
      accent_color: "#2563eb",
      heading_font: "poppins",
      pattern: "dots",
    },
  },
];

const USE_CASES = [
  { title: "Weddings", description: "From save-the-dates to the big day, with elegant scripted templates." },
  { title: "Birthdays & Anniversaries", description: "Playful, colorful cards for milestone celebrations." },
  { title: "Corporate Events", description: "Clean, professional invites for summits, launches, and offsites." },
  { title: "Religious & Community", description: "Traditional motifs for ceremonies and community gatherings." },
];

const FAQS = [
  {
    q: "Is NexaInvite really free to start?",
    a: "Yes. You can create an account, design invitations, publish, and collect RSVPs on the free plan. Premium templates and higher guest limits are available on paid tiers.",
  },
  {
    q: "Do my guests need to download an app?",
    a: "No. Guests open a shareable link or scan a QR code in any browser — no account or app required to RSVP.",
  },
  {
    q: "Can I change colors and fonts after picking a template?",
    a: "Yes. Every template's background, accent, and font colors are independently editable, alongside a choice of heading fonts and decorative patterns.",
  },
  {
    q: "How do I track who's coming?",
    a: "Your dashboard shows a live RSVP summary — accepted, declined, and pending — plus a full guest list you can manage in real time.",
  },
];

export default function NexaInvitePage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="ambient animate-pulse-soft -right-20 -top-20 h-80 w-80 bg-secondary/20" aria-hidden />
        <div
          className="ambient animate-pulse-soft -left-20 bottom-0 h-64 w-64 bg-accent/20"
          style={{ animationDelay: "1.2s" }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
            <div>
              <div className="animate-fade-in-up flex flex-wrap items-center gap-2">
                <span className="font-heading text-sm font-semibold text-muted">NexaForge</span>
                <span className="text-border-strong">|</span>
                <span className="font-heading text-lg font-semibold tracking-tight text-secondary">
                  Invite
                </span>
                <Badge variant="success" dot>
                  Operational
                </Badge>
              </div>
              <h1
                className="animate-fade-in-up mt-6 font-heading text-4xl font-bold leading-[1.1] tracking-tight text-heading sm:text-5xl"
                style={{ animationDelay: "100ms" }}
              >
                Design Beautiful Invitations. Share Instantly. Celebrate Together.
              </h1>
              <p
                className="animate-fade-in-up mt-6 max-w-xl text-lg leading-8 text-foreground/70"
                style={{ animationDelay: "200ms" }}
              >
                NexaInvite helps you create stunning digital invitations for weddings and events,
                track RSVPs, and manage your guest list — all without design skills.
              </p>
              <div
                className="animate-fade-in-up mt-9 flex flex-wrap items-center gap-3"
                style={{ animationDelay: "300ms" }}
              >
                <Link href="/register">
                  <Button variant="primary" size="lg">
                    Get Started — It&apos;s Free
                    <Icon name="arrow-right" size={18} />
                  </Button>
                </Link>
                <Link href="/templates">
                  <Button variant="outline" size="lg">
                    Explore Templates
                  </Button>
                </Link>
              </div>
              <p
                className="animate-fade-in-up mt-5 flex items-center gap-1.5 text-xs text-muted"
                style={{ animationDelay: "400ms" }}
              >
                <Icon name="shield" size={14} />
                No credit card required. Publish your first invitation in minutes.
              </p>
            </div>

            <div className="relative mx-auto hidden h-[420px] w-full max-w-md lg:block">
              <div
                className="animate-float absolute left-0 top-8 w-72 overflow-hidden rounded-xl shadow-xl"
                style={{ "--rot": "-6deg", transform: "rotate(-6deg)", animationDelay: "0s" } as React.CSSProperties}
              >
                <InvitationCanvas data={SHOWCASE[1].data} size="card" />
              </div>
              <div
                className="animate-float absolute right-0 top-0 w-72 overflow-hidden rounded-xl shadow-2xl"
                style={{ "--rot": "5deg", transform: "rotate(5deg)", animationDelay: "0.7s" } as React.CSSProperties}
              >
                <InvitationCanvas data={SHOWCASE[0].data} size="card" />
              </div>
              <div
                className="animate-float absolute bottom-0 left-8 w-72 overflow-hidden rounded-xl shadow-xl"
                style={{ "--rot": "3deg", transform: "rotate(3deg)", animationDelay: "1.4s" } as React.CSSProperties}
              >
                <InvitationCanvas data={SHOWCASE[2].data} size="card" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 lg:hidden">
              {SHOWCASE.map((s) => (
                <div key={s.label}>
                  <div className="overflow-hidden rounded-xl shadow-sm">
                    <InvitationCanvas data={s.data} size="card" />
                  </div>
                  <p className="mt-2 text-center text-xs text-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-12 sm:grid-cols-4 sm:px-6 sm:divide-x sm:divide-border">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80} className="px-2 text-center">
              <p className="font-heading text-2xl font-semibold tracking-tight text-heading">
                {stat.value}
              </p>
              <p className="mt-1.5 text-xs text-muted">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <h2 className="text-center font-heading text-2xl font-semibold tracking-tight text-heading sm:text-3xl">
            Everything you need to run an event
          </h2>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 80}>
              <Card interactive className="h-full">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/15">
                  <Icon name={feature.icon} size={20} />
                </span>
                <h3 className="mt-5 font-heading text-lg font-semibold text-heading">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-foreground/70">{feature.description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Template showcase */}
      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal className="text-center">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-heading sm:text-3xl">
              Made for every occasion
            </h2>
            <p className="mx-auto mt-2.5 max-w-xl leading-7 text-muted">
              A growing gallery of templates, each with independent colors, fonts, and decorative
              patterns.
            </p>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {SHOWCASE.map((s, i) => (
              <Reveal key={s.label} delay={i * 100}>
                <div className="card-hover rounded-xl">
                  <div className="overflow-hidden rounded-xl shadow-sm">
                    <InvitationCanvas data={s.data} size="card" />
                  </div>
                  <p className="mt-3.5 text-center text-sm font-medium text-foreground/70">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {USE_CASES.map((u, i) => (
              <Reveal key={u.title} delay={i * 60}>
                <Card interactive className="h-full bg-background p-5">
                  <h3 className="font-heading text-sm font-semibold text-heading">{u.title}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-muted">{u.description}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <h2 className="text-center font-heading text-2xl font-semibold tracking-tight text-heading sm:text-3xl">
            From template to published invite in minutes
          </h2>
        </Reveal>
        <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-4 sm:gap-6">
          {WORKFLOW.map((item, i) => (
            <li key={item.step}>
              <Reveal delay={i * 100} className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-secondary/20 bg-background font-heading text-sm font-semibold text-secondary shadow-2xs">
                  {item.step}
                </div>
                <h3 className="mt-3.5 font-heading text-sm font-semibold text-heading">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-muted">{item.description}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-background-subtle">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal>
            <h2 className="text-center font-heading text-2xl font-semibold tracking-tight text-heading sm:text-3xl">
              Frequently asked questions
            </h2>
          </Reveal>
          <div className="mt-12 space-y-4">
            {FAQS.map((faq, i) => (
              <Reveal key={faq.q} delay={i * 80}>
                <Card interactive className="bg-background">
                  <h3 className="flex items-start gap-2.5 font-heading text-base font-semibold text-heading">
                    <Icon name="info" size={18} className="mt-0.5 text-secondary" />
                    {faq.q}
                  </h3>
                  <p className="mt-2.5 pl-[1.8rem] text-sm leading-6 text-foreground/70">{faq.a}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section
        className="animate-gradient border-t border-border"
        style={{
          background: "linear-gradient(120deg, #0b1f3a 0%, #14315c 50%, #0b1f3a 100%)",
        }}
      >
        <Reveal className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-3.5 leading-7 text-white/70">
            Start free. Upgrade only when you need premium templates and higher guest limits.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/pricing">
              <Button variant="primary" size="lg">
                View Pricing
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="inverse" size="lg">
                Get Started Free
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
