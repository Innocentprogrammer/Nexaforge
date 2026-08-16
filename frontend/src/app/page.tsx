"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Product, Paginated } from "@/lib/types";

const TODAY = [
  { label: "SaaS product live", value: "NexaInvite" },
  { label: "Products on the roadmap", value: "5" },
  { label: "Engineering", value: "100% in-house" },
  { label: "Status", value: "Open for early customers" },
];

const SERVICES_TEASER = [
  { icon: "⚙", title: "Custom Software", description: "Tailor-made solutions engineered for scale." },
  { icon: "✦", title: "AI Development", description: "AI features and automation built into your product." },
  { icon: "✓", title: "QA Automation", description: "Continuous testing pipelines that catch regressions." },
  { icon: "☁", title: "Cloud Services", description: "Zero-downtime infrastructure on modern cloud stacks." },
];

const WHY_NEXAFORGE = [
  "AI-first approach — architected to be autonomous and self-improving from the ground up.",
  "Modern technology stack — Next.js, Django, and PostgreSQL built for the next decade.",
  "Enterprise-grade quality — production-ready code, tested end-to-end before it ships.",
  "Transparent communication — no jargon, no surprises, real answers.",
  "Security by design — built to WCAG and modern web-security standards from day one.",
  "Long-term partnership — we build products we intend to support for years.",
];

const ECOSYSTEM_CARDS = [
  {
    name: "NexaInvite",
    tagline: "Digital invitations & RSVPs",
    status: "Operational",
    variant: "success" as const,
    rot: -6,
    bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    fg: "#1e3a8a",
  },
  {
    name: "NexaCRM",
    tagline: "Customer relationships",
    status: "Coming Soon",
    variant: "default" as const,
    rot: 4,
    bg: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
    fg: "#334155",
  },
  {
    name: "NexaAI",
    tagline: "Automation & agents",
    status: "Coming Soon",
    variant: "default" as const,
    rot: -2,
    bg: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
    fg: "#065f46",
  },
];

function statusBadge(status: Product["status"]) {
  if (status === "OPERATIONAL") return <Badge variant="success">Operational</Badge>;
  if (status === "BETA") return <Badge variant="warning">Beta</Badge>;
  return <Badge>Coming Soon</Badge>;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    api
      .get<Paginated<Product>>("/products/", { auth: false })
      .then((res) => setProducts(res.results.slice(0, 3)))
      .catch(() => setProducts([]));
  }, []);

  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="animate-pulse-soft pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-secondary/20 blur-3xl"
          aria-hidden
        />
        <div
          className="animate-pulse-soft pointer-events-none absolute -left-24 top-1/2 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
          style={{ animationDelay: "1.5s" }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 sm:pt-28">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <span className="animate-fade-in-up inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary">
                NexaForge Technologies
              </span>
              <h1
                className="animate-fade-in-up mx-auto mt-6 max-w-3xl font-heading text-4xl font-bold leading-tight text-primary sm:text-5xl lg:mx-0"
                style={{ animationDelay: "100ms" }}
              >
                Engineering the Future of Digital Business
              </h1>
              <p
                className="animate-fade-in-up mx-auto mt-6 max-w-2xl text-lg text-foreground/70 lg:mx-0"
                style={{ animationDelay: "200ms" }}
              >
                We build AI-powered software, automation platforms, and scalable digital solutions
                that help businesses grow faster.
              </p>
              <div
                className="animate-fade-in-up mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
                style={{ animationDelay: "300ms" }}
              >
                <Link href="/products">
                  <Button variant="primary" className="px-6 py-3 text-base">
                    Explore Products
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" className="px-6 py-3 text-base">
                    Book a Consultation
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative mx-auto hidden h-80 w-full max-w-md lg:block">
              {ECOSYSTEM_CARDS.map((card, i) => (
                <div
                  key={card.name}
                  className="animate-float absolute w-64 rounded-xl border border-border p-5 shadow-xl"
                  style={{
                    background: card.bg,
                    top: `${i * 22}px`,
                    left: `${i * 60}px`,
                    // @ts-expect-error -- CSS custom property for the float keyframe's rotation
                    "--rot": `${card.rot}deg`,
                    transform: `rotate(${card.rot}deg)`,
                    animationDelay: `${i * 0.6}s`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading text-base font-semibold" style={{ color: card.fg }}>
                      {card.name}
                    </p>
                    <Badge variant={card.variant}>{card.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: card.fg, opacity: 0.75 }}>
                    {card.tagline}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Where we are today */}
      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {TODAY.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80} className="text-center">
              <p className="font-heading text-lg font-semibold text-primary sm:text-xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-foreground/60">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Products teaser */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">
              The NexaForge Ecosystem
            </h2>
            <p className="mt-2 max-w-xl text-foreground/60">
              Purpose-built SaaS products sharing one platform, one login, and one design
              language.
            </p>
          </div>
          <Link href="/products" className="text-sm font-medium text-secondary">
            View all products →
          </Link>
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {products.map((product, i) => (
            <Reveal key={product.id} delay={i * 100}>
              <Card className="card-hover flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <h3 className="font-heading text-lg font-semibold text-primary">
                    {product.name}
                  </h3>
                  {statusBadge(product.status)}
                </div>
                <p className="mt-1 text-sm font-medium text-foreground/60">{product.tagline}</p>
                <p className="mt-3 flex-1 text-sm text-foreground/60">{product.description}</p>
                {product.href ? (
                  <Link href={product.href} className="mt-4">
                    <Button variant="outline" className="w-full">
                      Learn More
                    </Button>
                  </Link>
                ) : (
                  <Button variant="ghost" className="mt-4 w-full" disabled>
                    Coming Soon
                  </Button>
                )}
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Services teaser */}
      <section className="border-t border-border bg-background-subtle">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">
              Expert Services
            </h2>
            <Link href="/services" className="text-sm font-medium text-secondary">
              Explore all services →
            </Link>
          </Reveal>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES_TEASER.map((service, i) => (
              <Reveal key={service.title} delay={i * 80}>
                <Card className="card-hover h-full bg-background">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-lg text-secondary">
                    {service.icon}
                  </span>
                  <h3 className="mt-4 font-heading text-base font-semibold text-primary">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm text-foreground/60">{service.description}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why NexaForge */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <Reveal>
          <h2 className="text-center font-heading text-2xl font-semibold text-primary sm:text-3xl">
            Why Choose NexaForge
          </h2>
        </Reveal>
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {WHY_NEXAFORGE.map((point, i) => (
            <Reveal key={point} delay={i * 60}>
              <li className="flex gap-3 text-sm text-foreground/70">
                <span className="mt-0.5 text-secondary">✓</span>
                <span>{point}</span>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section
        className="animate-gradient border-t border-border"
        style={{
          background: "linear-gradient(120deg, #0b1f3a 0%, #14315c 50%, #0b1f3a 100%)",
        }}
      >
        <Reveal className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-heading text-2xl font-semibold text-white sm:text-3xl">
            Ready to build with NexaForge?
          </h2>
          <p className="mt-3 text-white/70">
            Start with NexaInvite today, or talk to us about what we&apos;re building next.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/products">
              <Button variant="primary" className="px-6 py-3 text-base">
                Explore Products
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                className="border-white px-6 py-3 text-base text-white hover:bg-white/10"
              >
                Book a Consultation
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
