"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Product, Paginated } from "@/lib/types";

const TODAY = [
  { label: "SaaS product live", value: "NexaInvite" },
  { label: "Products on the roadmap", value: "5" },
  { label: "Engineering", value: "100% in-house" },
  { label: "Status", value: "Open for early customers" },
];

const SERVICES_TEASER: { icon: IconName; title: string; description: string }[] = [
  { icon: "cog", title: "Custom Software", description: "Tailor-made solutions engineered for scale." },
  { icon: "sparkles", title: "AI Development", description: "AI features and automation built into your product." },
  { icon: "check-circle", title: "QA Automation", description: "Continuous testing pipelines that catch regressions." },
  { icon: "cloud", title: "Cloud Services", description: "Zero-downtime infrastructure on modern cloud stacks." },
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
  if (status === "OPERATIONAL") return <Badge variant="success" dot>Operational</Badge>;
  if (status === "BETA") return <Badge variant="warning" dot>Beta</Badge>;
  return <Badge dot>Coming Soon</Badge>;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<Paginated<Product>>("/products/", { auth: false })
      .then((res) => setProducts(res.results.slice(0, 3)))
      .catch(() => setProducts([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="ambient animate-pulse-soft -right-24 -top-32 h-96 w-96 bg-secondary/25" aria-hidden />
        <div
          className="ambient animate-pulse-soft -left-24 top-1/2 h-72 w-72 bg-accent/20"
          style={{ animationDelay: "1.5s" }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <span className="animate-fade-in-up inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary shadow-2xs backdrop-blur">
                <Icon name="zap" size={13} />
                NexaForge Technologies
              </span>
              <h1
                className="animate-fade-in-up mx-auto mt-6 max-w-3xl font-heading text-4xl font-bold leading-[1.1] text-heading sm:text-5xl lg:mx-0"
                style={{ animationDelay: "100ms" }}
              >
                Engineering the Future of Digital Business
              </h1>
              <p
                className="animate-fade-in-up mx-auto mt-6 max-w-2xl text-lg leading-8 text-foreground/70 lg:mx-0"
                style={{ animationDelay: "200ms" }}
              >
                We build AI-powered software, automation platforms, and scalable digital solutions
                that help businesses grow faster.
              </p>
              <div
                className="animate-fade-in-up mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
                style={{ animationDelay: "300ms" }}
              >
                <Link href="/products">
                  <Button variant="primary" size="lg">
                    Explore Products
                    <Icon name="arrow-right" size={18} />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" size="lg">
                    Book a Consultation
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative mx-auto hidden h-80 w-full max-w-md lg:block">
              {ECOSYSTEM_CARDS.map((card, i) => (
                <div
                  key={card.name}
                  className="animate-float absolute w-64 rounded-2xl border border-white/60 p-5 shadow-xl"
                  style={{
                    background: card.bg,
                    top: `${i * 24}px`,
                    left: `${i * 58}px`,
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
                  <p className="mt-1.5 text-xs" style={{ color: card.fg, opacity: 0.75 }}>
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
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-12 sm:grid-cols-4 sm:px-6 sm:divide-x sm:divide-border">
          {TODAY.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80} className="px-2 text-center">
              <p className="font-heading text-lg font-semibold text-heading sm:text-xl">
                {stat.value}
              </p>
              <p className="mt-1.5 text-xs text-muted">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Products teaser */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-heading sm:text-3xl">
              The NexaForge Ecosystem
            </h2>
            <p className="mt-2.5 max-w-xl leading-7 text-muted">
              Purpose-built SaaS products sharing one platform, one login, and one design language.
            </p>
          </div>
          <Link
            href="/products"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-secondary"
          >
            View all products
            <Icon
              name="arrow-right"
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </Reveal>

        {isLoading ? (
          <SkeletonGrid count={3} className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3" />
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {products.map((product, i) => (
              <Reveal key={product.id} delay={i * 100}>
                <Card interactive className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-heading text-lg font-semibold text-heading">
                      {product.name}
                    </h3>
                    {statusBadge(product.status)}
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-foreground/70">{product.tagline}</p>
                  <p className="mt-3.5 flex-1 text-sm leading-6 text-muted">{product.description}</p>
                  {product.href ? (
                    <Link href={product.href} className="mt-6">
                      <Button variant="outline" className="w-full">
                        Learn More
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="ghost" className="mt-6 w-full" disabled>
                      Coming Soon
                    </Button>
                  )}
                </Card>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* Services teaser */}
      <section className="border-t border-border bg-background-subtle">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-heading sm:text-3xl">
              Expert Services
            </h2>
            <Link
              href="/services"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-secondary"
            >
              Explore all services
              <Icon
                name="arrow-right"
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES_TEASER.map((service, i) => (
              <Reveal key={service.title} delay={i * 80}>
                <Card interactive className="h-full">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/15">
                    <Icon name={service.icon} size={20} />
                  </span>
                  <h3 className="mt-4 font-heading text-base font-semibold text-heading">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{service.description}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why NexaForge */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <h2 className="text-center font-heading text-2xl font-semibold tracking-tight text-heading sm:text-3xl">
            Why Choose NexaForge
          </h2>
        </Reveal>
        <ul className="mt-12 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {WHY_NEXAFORGE.map((point, i) => (
            <Reveal key={point} delay={i * 60}>
              <li className="flex gap-3 text-sm leading-6 text-foreground/70">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                  <Icon name="check" size={13} strokeWidth={2.25} />
                </span>
                <span>{point}</span>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section
        className="animate-gradient relative overflow-hidden border-t border-border"
        style={{
          background: "linear-gradient(120deg, #0b1f3a 0%, #14315c 50%, #0b1f3a 100%)",
        }}
      >
        <Reveal className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Ready to build with NexaForge?
          </h2>
          <p className="mt-3.5 leading-7 text-white/70">
            Start with NexaInvite today, or talk to us about what we&apos;re building next.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/products">
              <Button variant="primary" size="lg">
                Explore Products
                <Icon name="arrow-right" size={18} />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="inverse" size="lg">
                Book a Consultation
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
