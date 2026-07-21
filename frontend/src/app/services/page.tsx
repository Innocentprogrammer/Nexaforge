import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SERVICES = [
  {
    title: "Custom Software Development",
    description:
      "Tailor-made solutions engineered for high performance and horizontal scale, from first prototype to production.",
  },
  {
    title: "AI Development",
    description:
      "Integrating advanced machine learning models into existing workflows — from recommendation to automation.",
  },
  {
    title: "QA Automation",
    description:
      "Continuous testing pipelines that catch regressions before they reach your users.",
  },
  {
    title: "Cloud & DevOps",
    description:
      "Zero-downtime migrations and managed infrastructure on modern cloud providers, monitored end to end.",
  },
  {
    title: "Data Analytics",
    description:
      "Turning raw operational data into dashboards and decisions your team can act on.",
  },
  {
    title: "Consulting",
    description:
      "Architecture reviews, technology roadmaps, and hands-on guidance for teams scaling their engineering.",
  },
];

export default function ServicesPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 pb-10 pt-20 text-center">
        <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">
          Expert Services
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-foreground/70">
          From concept to deployment, we provide the architectural foundation for your
          digital transformation.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <Card key={service.title}>
              <h2 className="font-heading text-lg font-semibold text-primary">
                {service.title}
              </h2>
              <p className="mt-2 text-sm text-foreground/60">{service.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-background-subtle">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-heading text-2xl font-semibold text-primary">
            Have a project in mind?
          </h2>
          <p className="mt-3 text-foreground/60">
            Tell us what you&apos;re building — we respond within one business day.
          </p>
          <Link href="/contact" className="mt-6 inline-block">
            <Button variant="primary" className="px-6 py-3 text-base">
              Book a Consultation
            </Button>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
