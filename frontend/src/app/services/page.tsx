import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SERVICES = [
  {
    icon: "⚙",
    title: "Custom Software Development",
    description:
      "Tailor-made solutions engineered for high performance and horizontal scale, from first prototype to production.",
  },
  {
    icon: "✦",
    title: "AI Development",
    description:
      "Integrating advanced machine learning models into existing workflows — from recommendation to automation.",
  },
  {
    icon: "✓",
    title: "QA Automation",
    description:
      "Continuous testing pipelines that catch regressions before they reach your users.",
  },
  {
    icon: "☁",
    title: "Cloud & DevOps",
    description:
      "Zero-downtime migrations and managed infrastructure on modern cloud providers, monitored end to end.",
  },
  {
    icon: "◆",
    title: "Data Analytics",
    description:
      "Turning raw operational data into dashboards and decisions your team can act on.",
  },
  {
    icon: "⚑",
    title: "Consulting",
    description:
      "Architecture reviews, technology roadmaps, and hands-on guidance for teams scaling their engineering.",
  },
];

export default function ServicesPage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden">
        <div
          className="animate-pulse-soft pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-secondary/20 blur-3xl"
          aria-hidden
        />
        <div
          className="animate-pulse-soft pointer-events-none absolute -left-20 top-1/2 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
          style={{ animationDelay: "1.2s" }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-6 pb-10 pt-20 text-center">
          <span className="animate-fade-in-up inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary">
            What We Do
          </span>
          <h1
            className="animate-fade-in-up mt-4 font-heading text-3xl font-bold text-primary sm:text-4xl"
            style={{ animationDelay: "100ms" }}
          >
            Expert Services
          </h1>
          <p
            className="animate-fade-in-up mx-auto mt-4 max-w-2xl text-lg text-foreground/70"
            style={{ animationDelay: "200ms" }}
          >
            From concept to deployment, we provide the architectural foundation for your
            digital transformation.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <Reveal key={service.title} delay={i * 80}>
              <Card className="card-hover h-full">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-lg text-secondary">
                  {service.icon}
                </span>
                <h2 className="mt-4 font-heading text-lg font-semibold text-primary">
                  {service.title}
                </h2>
                <p className="mt-2 text-sm text-foreground/60">{service.description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section
        className="animate-gradient border-t border-border"
        style={{ background: "linear-gradient(120deg, #0b1f3a 0%, #14315c 50%, #0b1f3a 100%)" }}
      >
        <Reveal className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-heading text-2xl font-semibold text-white">
            Have a project in mind?
          </h2>
          <p className="mt-3 text-white/70">
            Tell us what you&apos;re building — we respond within one business day.
          </p>
          <Link href="/contact" className="mt-6 inline-block">
            <Button variant="primary" className="px-6 py-3 text-base">
              Book a Consultation
            </Button>
          </Link>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
