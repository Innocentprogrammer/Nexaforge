"use client";

import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";

const FEATURES = [
  {
    title: "Beautiful Templates",
    description: "Pick from wedding, birthday, anniversary, corporate, and religious designs.",
  },
  {
    title: "Easy Customization",
    description: "Edit text, colors, and event details with a live preview — no design skills.",
  },
  {
    title: "Guest & RSVP Tracking",
    description: "Manage your guest list and see RSVPs roll in, all in real time.",
  },
  {
    title: "Instant Sharing",
    description: "Share a link or QR code — no app download required for guests.",
  },
];

const WORKFLOW = [
  { step: "1", title: "Choose a template", description: "Browse the gallery, filtered by event type." },
  { step: "2", title: "Customize", description: "Edit event details, headline, and colors with a live preview." },
  { step: "3", title: "Publish", description: "Get a shareable link and QR code instantly." },
  { step: "4", title: "Track RSVPs", description: "Watch responses arrive on your owner dashboard." },
];

export default function NexaInvitePage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="font-heading text-sm font-semibold text-foreground/50">NexaForge</span>
          <span className="text-foreground/30">|</span>
          <span className="font-heading text-lg font-semibold text-secondary">Invite</span>
          <Badge variant="success">Operational</Badge>
        </div>
        <h1 className="mx-auto mt-6 max-w-2xl font-heading text-4xl font-bold leading-tight text-primary sm:text-5xl">
          Design Beautiful Invitations. Share Instantly. Celebrate Together.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-foreground/70">
          NexaInvite helps you create stunning digital invitations for weddings and events,
          track RSVPs, and manage your guest list — all without design skills.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/register">
            <Button variant="primary" className="px-6 py-3 text-base">
              Launch App — It&apos;s Free
            </Button>
          </Link>
          <Link href="/templates">
            <Button variant="outline" className="px-6 py-3 text-base">
              Explore Templates
            </Button>
          </Link>
        </div>
      </section>

      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center font-heading text-2xl font-semibold text-primary">
            Everything you need to run an event
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="bg-background">
                <h3 className="font-heading text-lg font-semibold text-primary">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-foreground/70">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center font-heading text-2xl font-semibold text-primary">
          From template to published invite in minutes
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-4">
          {WORKFLOW.map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 font-heading text-sm font-semibold text-secondary">
                {item.step}
              </div>
              <h3 className="mt-3 font-heading text-sm font-semibold text-primary">
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-foreground/60">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-primary">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
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
                Launch App
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
