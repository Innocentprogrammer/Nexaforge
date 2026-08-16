"use client";

import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { InvitationCanvas } from "@/components/invitation-canvas";

const STATS = [
  { label: "Invitation templates", value: "8+" },
  { label: "To start", value: "Free" },
  { label: "App download needed", value: "None" },
  { label: "RSVP tracking", value: "Real-time" },
];

const FEATURES = [
  {
    icon: "✦",
    title: "Beautiful Templates",
    description: "Pick from wedding, birthday, anniversary, corporate, and religious designs.",
  },
  {
    icon: "✎",
    title: "Easy Customization",
    description: "Edit text, colors, fonts, and event details with a live preview — no design skills.",
  },
  {
    icon: "✓",
    title: "Guest & RSVP Tracking",
    description: "Manage your guest list and watch RSVPs roll in, all from one dashboard.",
  },
  {
    icon: "⤳",
    title: "Instant Sharing",
    description: "Share a link or QR code — guests need zero app downloads to respond.",
  },
  {
    icon: "❁",
    title: "Rich Visual Patterns",
    description: "Frames, dots, sparkle, confetti, and floral motifs bring every card to life.",
  },
  {
    icon: "⏱",
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
        <div
          className="animate-pulse-soft pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-secondary/20 blur-3xl"
          aria-hidden
        />
        <div
          className="animate-pulse-soft pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
          style={{ animationDelay: "1.2s" }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="animate-fade-in-up flex items-center gap-2">
                <span className="font-heading text-sm font-semibold text-foreground/50">NexaForge</span>
                <span className="text-foreground/30">|</span>
                <span className="font-heading text-lg font-semibold text-secondary">Invite</span>
                <Badge variant="success">Operational</Badge>
              </div>
              <h1
                className="animate-fade-in-up mt-6 font-heading text-4xl font-bold leading-tight text-primary sm:text-5xl"
                style={{ animationDelay: "100ms" }}
              >
                Design Beautiful Invitations. Share Instantly. Celebrate Together.
              </h1>
              <p
                className="animate-fade-in-up mt-6 max-w-xl text-lg text-foreground/70"
                style={{ animationDelay: "200ms" }}
              >
                NexaInvite helps you create stunning digital invitations for weddings and events,
                track RSVPs, and manage your guest list — all without design skills.
              </p>
              <div
                className="animate-fade-in-up mt-8 flex flex-wrap items-center gap-4"
                style={{ animationDelay: "300ms" }}
              >
                <Link href="/register">
                  <Button variant="primary" className="px-6 py-3 text-base">
                    Get Started — It&apos;s Free
                  </Button>
                </Link>
                <Link href="/templates">
                  <Button variant="outline" className="px-6 py-3 text-base">
                    Explore Templates
                  </Button>
                </Link>
              </div>
              <p
                className="animate-fade-in-up mt-4 text-xs text-foreground/50"
                style={{ animationDelay: "400ms" }}
              >
                No credit card required. Publish your first invitation in minutes.
              </p>
            </div>

            <div className="relative mx-auto hidden h-[420px] w-full max-w-md lg:block">
              <div
                className="animate-float absolute left-0 top-8 w-72 shadow-xl"
                style={{ "--rot": "-6deg", transform: "rotate(-6deg)", animationDelay: "0s" } as React.CSSProperties}
              >
                <InvitationCanvas data={SHOWCASE[1].data} size="card" />
              </div>
              <div
                className="animate-float absolute right-0 top-0 w-72 shadow-2xl"
                style={{ "--rot": "5deg", transform: "rotate(5deg)", animationDelay: "0.7s" } as React.CSSProperties}
              >
                <InvitationCanvas data={SHOWCASE[0].data} size="card" />
              </div>
              <div
                className="animate-float absolute bottom-0 left-8 w-72 shadow-xl"
                style={{ "--rot": "3deg", transform: "rotate(3deg)", animationDelay: "1.4s" } as React.CSSProperties}
              >
                <InvitationCanvas data={SHOWCASE[2].data} size="card" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 lg:hidden">
              {SHOWCASE.map((s) => (
                <div key={s.label}>
                  <InvitationCanvas data={s.data} size="card" />
                  <p className="mt-2 text-center text-xs text-foreground/50">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80} className="text-center">
              <p className="font-heading text-2xl font-semibold text-primary">{stat.value}</p>
              <p className="mt-1 text-xs text-foreground/60">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <Reveal>
          <h2 className="text-center font-heading text-2xl font-semibold text-primary sm:text-3xl">
            Everything you need to run an event
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 80}>
              <Card className="card-hover h-full">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-lg text-secondary">
                  {feature.icon}
                </span>
                <h3 className="mt-4 font-heading text-lg font-semibold text-primary">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-foreground/70">{feature.description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Template showcase */}
      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Reveal className="text-center">
            <h2 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">
              Made for every occasion
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-foreground/60">
              A growing gallery of templates, each with independent colors, fonts, and decorative
              patterns.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {SHOWCASE.map((s, i) => (
              <Reveal key={s.label} delay={i * 100}>
                <div className="card-hover rounded-xl">
                  <InvitationCanvas data={s.data} size="card" />
                  <p className="mt-3 text-center text-sm font-medium text-foreground/70">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {USE_CASES.map((u, i) => (
              <Reveal key={u.title} delay={i * 60}>
                <Card className="card-hover h-full bg-background">
                  <h3 className="font-heading text-sm font-semibold text-primary">{u.title}</h3>
                  <p className="mt-1 text-xs text-foreground/60">{u.description}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <Reveal>
          <h2 className="text-center font-heading text-2xl font-semibold text-primary sm:text-3xl">
            From template to published invite in minutes
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-4">
          {WORKFLOW.map((item, i) => (
            <Reveal key={item.step} delay={i * 100} className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 font-heading text-sm font-semibold text-secondary">
                {item.step}
              </div>
              <h3 className="mt-3 font-heading text-sm font-semibold text-primary">
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-foreground/60">{item.description}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-background-subtle">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <Reveal>
            <h2 className="text-center font-heading text-2xl font-semibold text-primary sm:text-3xl">
              Frequently asked questions
            </h2>
          </Reveal>
          <div className="mt-10 space-y-6">
            {FAQS.map((faq, i) => (
              <Reveal key={faq.q} delay={i * 80}>
                <Card className="bg-background">
                  <h3 className="font-heading text-base font-semibold text-primary">{faq.q}</h3>
                  <p className="mt-2 text-sm text-foreground/70">{faq.a}</p>
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
        <Reveal className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-heading text-2xl font-semibold text-white">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-white/70">
            Start free. Upgrade only when you need premium templates and higher guest limits.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/pricing">
              <Button variant="primary" className="px-6 py-3 text-base">
                View Pricing
              </Button>
            </Link>
            <Link href="/register">
              <Button
                variant="outline"
                className="border-white px-6 py-3 text-base text-white hover:bg-white/10"
              >
                Get Started Free
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
