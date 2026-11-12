import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

const STATS = [
  { label: "Founded", value: "2026" },
  { label: "Products live", value: "1" },
  { label: "Products on the roadmap", value: "5" },
  { label: "Engineering", value: "100% in-house" },
];

const VALUES = [
  "Innovation",
  "Integrity",
  "Excellence",
  "Ownership",
  "Simplicity",
  "Customer Success",
  "Continuous Learning",
  "Long-Term Thinking",
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden">
        <div className="ambient animate-pulse-soft -right-20 -top-20 h-80 w-80 bg-secondary/20" aria-hidden />
        <div
          className="ambient animate-pulse-soft -left-20 top-1/2 h-64 w-64 bg-accent/20"
          style={{ animationDelay: "1.2s" }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 pb-12 pt-20 text-center sm:px-6">
          <span className="animate-fade-in-up inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary shadow-2xs backdrop-blur">
            <Icon name="building" size={13} />
            About NexaForge
          </span>
          <h1
            className="animate-fade-in-up mt-5 font-heading text-3xl font-bold tracking-tight text-heading sm:text-4xl"
            style={{ animationDelay: "100ms" }}
          >
            Forging the Future of Digital Businesses
          </h1>
          <p
            className="animate-fade-in-up mx-auto mt-5 max-w-2xl text-lg leading-8 text-foreground/70"
            style={{ animationDelay: "200ms" }}
          >
            Most technology companies focus on selling software. NexaForge exists to solve business
            problems — whether that&apos;s a couple sending their first digital wedding invitation,
            or an enterprise automating thousands of workflows.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-12 sm:grid-cols-4 sm:px-6 sm:divide-x sm:divide-border">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80} className="px-2 text-center">
              <p className="font-heading text-lg font-semibold text-heading sm:text-xl">
                {stat.value}
              </p>
              <p className="mt-1.5 text-xs text-muted">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Reveal>
            <Card interactive className="h-full">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/15">
                <Icon name="target" size={20} />
              </span>
              <h2 className="mt-5 font-heading text-lg font-semibold text-heading">Our Mission</h2>
              <p className="mt-2 text-sm leading-6 text-foreground/70">
                To create intelligent, scalable, and beautiful digital products that help businesses
                innovate, automate, and grow.
              </p>
            </Card>
          </Reveal>
          <Reveal delay={100}>
            <Card interactive className="h-full">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/15">
                <Icon name="eye" size={20} />
              </span>
              <h2 className="mt-5 font-heading text-lg font-semibold text-heading">Our Vision</h2>
              <p className="mt-2 text-sm leading-6 text-foreground/70">
                A world where every business, regardless of size, has access to world-class
                technology — technology that empowers rather than overwhelms.
              </p>
            </Card>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <Reveal>
            <h2 className="text-center font-heading text-2xl font-semibold tracking-tight text-heading sm:text-3xl">
              What We Value
            </h2>
          </Reveal>
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {VALUES.map((value, i) => (
              <Reveal key={value} delay={i * 50}>
                <span className="inline-block rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground/70 shadow-2xs transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-secondary/40 hover:text-secondary hover:shadow-sm">
                  {value}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-24">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-heading">
            We are not a website company. We are not a freelancer agency.
          </h2>
          <p className="mt-5 text-lg font-medium text-secondary">We are a Technology Partner.</p>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
