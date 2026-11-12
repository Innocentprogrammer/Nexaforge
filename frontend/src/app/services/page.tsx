import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";

const SERVICES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "cog",
    title: "Custom Software Development",
    description:
      "Tailor-made solutions engineered for high performance and horizontal scale, from first prototype to production.",
  },
  {
    icon: "sparkles",
    title: "AI Development",
    description:
      "Integrating advanced machine learning models into existing workflows — from recommendation to automation.",
  },
  {
    icon: "check-circle",
    title: "QA Automation",
    description:
      "Continuous testing pipelines that catch regressions before they reach your users.",
  },
  {
    icon: "cloud",
    title: "Cloud & DevOps",
    description:
      "Zero-downtime migrations and managed infrastructure on modern cloud providers, monitored end to end.",
  },
  {
    icon: "chart",
    title: "Data Analytics",
    description:
      "Turning raw operational data into dashboards and decisions your team can act on.",
  },
  {
    icon: "flag",
    title: "Consulting",
    description:
      "Architecture reviews, technology roadmaps, and hands-on guidance for teams scaling their engineering.",
  },
];

export default function ServicesPage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden">
        <div className="ambient animate-pulse-soft -right-20 -top-20 h-80 w-80 bg-secondary/20" aria-hidden />
        <div
          className="ambient animate-pulse-soft -left-20 top-1/2 h-64 w-64 bg-accent/20"
          style={{ animationDelay: "1.2s" }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-4 pb-12 pt-20 text-center sm:px-6">
          <span className="animate-fade-in-up inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary shadow-2xs backdrop-blur">
            <Icon name="target" size={13} />
            What We Do
          </span>
          <h1
            className="animate-fade-in-up mt-5 font-heading text-3xl font-bold tracking-tight text-heading sm:text-4xl"
            style={{ animationDelay: "100ms" }}
          >
            Expert Services
          </h1>
          <p
            className="animate-fade-in-up mx-auto mt-5 max-w-2xl text-lg leading-8 text-foreground/70"
            style={{ animationDelay: "200ms" }}
          >
            From concept to deployment, we provide the architectural foundation for your digital
            transformation.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <Reveal key={service.title} delay={i * 80}>
              <Card interactive className="h-full">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/15">
                  <Icon name={service.icon} size={20} />
                </span>
                <h2 className="mt-5 font-heading text-lg font-semibold text-heading">
                  {service.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">{service.description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section
        className="animate-gradient border-t border-border"
        style={{ background: "linear-gradient(120deg, #0b1f3a 0%, #14315c 50%, #0b1f3a 100%)" }}
      >
        <Reveal className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Have a project in mind?
          </h2>
          <p className="mt-3.5 leading-7 text-white/70">
            Tell us what you&apos;re building — we respond within one business day.
          </p>
          <Link href="/contact" className="mt-9 inline-block">
            <Button variant="primary" size="lg">
              Book a Consultation
              <Icon name="arrow-right" size={18} />
            </Button>
          </Link>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
