"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
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
  { title: "Custom Software", description: "Tailor-made solutions engineered for scale." },
  { title: "AI Development", description: "AI features and automation built into your product." },
  { title: "QA Automation", description: "Continuous testing pipelines that catch regressions." },
  { title: "Cloud Services", description: "Zero-downtime infrastructure on modern cloud stacks." },
];

const WHY_NEXAFORGE = [
  "AI-first approach — architected to be autonomous and self-improving from the ground up.",
  "Modern technology stack — Next.js, Django, and PostgreSQL built for the next decade.",
  "Enterprise-grade quality — production-ready code, tested end-to-end before it ships.",
  "Transparent communication — no jargon, no surprises, real answers.",
  "Security by design — built to WCAG and modern web-security standards from day one.",
  "Long-term partnership — we build products we intend to support for years.",
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
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center sm:pt-28">
        <span className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary">
          NexaForge Technologies
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl font-heading text-4xl font-bold leading-tight text-primary sm:text-5xl">
          Engineering the Future of Digital Business
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground/70">
          We build AI-powered software, automation platforms, and scalable digital solutions
          that help businesses grow faster.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
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
      </section>

      {/* Where we are today */}
      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {TODAY.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-heading text-lg font-semibold text-primary sm:text-xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-foreground/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Products teaser */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
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
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col">
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
          ))}
        </div>
      </section>

      {/* Services teaser */}
      <section className="border-t border-border bg-background-subtle">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">
              Expert Services
            </h2>
            <Link href="/services" className="text-sm font-medium text-secondary">
              Explore all services →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES_TEASER.map((service) => (
              <Card key={service.title} className="bg-background">
                <h3 className="font-heading text-base font-semibold text-primary">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm text-foreground/60">{service.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why NexaForge */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-center font-heading text-2xl font-semibold text-primary sm:text-3xl">
          Why Choose NexaForge
        </h2>
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {WHY_NEXAFORGE.map((point) => (
            <li key={point} className="flex gap-3 text-sm text-foreground/70">
              <span className="mt-0.5 text-secondary">✓</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-primary">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
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
        </div>
      </section>
    </MarketingShell>
  );
}
