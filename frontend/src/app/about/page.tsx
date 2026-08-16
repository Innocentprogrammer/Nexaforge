import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Card } from "@/components/ui/card";

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
        <div
          className="animate-pulse-soft pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-secondary/20 blur-3xl"
          aria-hidden
        />
        <div
          className="animate-pulse-soft pointer-events-none absolute -left-20 top-1/2 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
          style={{ animationDelay: "1.2s" }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-6 pb-10 pt-20 text-center">
          <span className="animate-fade-in-up text-sm font-semibold uppercase tracking-wide text-secondary">
            About NexaForge
          </span>
          <h1
            className="animate-fade-in-up mt-3 font-heading text-3xl font-bold text-primary sm:text-4xl"
            style={{ animationDelay: "100ms" }}
          >
            Forging the Future of Digital Businesses
          </h1>
          <p
            className="animate-fade-in-up mx-auto mt-4 max-w-2xl text-lg text-foreground/70"
            style={{ animationDelay: "200ms" }}
          >
            Most technology companies focus on selling software. NexaForge exists to solve
            business problems — whether that&apos;s a couple sending their first digital
            wedding invitation, or an enterprise automating thousands of workflows.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80} className="text-center">
              <p className="font-heading text-lg font-semibold text-primary sm:text-xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-foreground/60">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Reveal>
            <Card className="card-hover h-full">
              <h2 className="font-heading text-lg font-semibold text-primary">Our Mission</h2>
              <p className="mt-2 text-sm text-foreground/70">
                To create intelligent, scalable, and beautiful digital products that help
                businesses innovate, automate, and grow.
              </p>
            </Card>
          </Reveal>
          <Reveal delay={100}>
            <Card className="card-hover h-full">
              <h2 className="font-heading text-lg font-semibold text-primary">Our Vision</h2>
              <p className="mt-2 text-sm text-foreground/70">
                A world where every business, regardless of size, has access to world-class
                technology — technology that empowers rather than overwhelms.
              </p>
            </Card>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <Reveal>
            <h2 className="text-center font-heading text-2xl font-semibold text-primary">
              What We Value
            </h2>
          </Reveal>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {VALUES.map((value, i) => (
              <Reveal key={value} delay={i * 50}>
                <span className="inline-block rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-secondary hover:text-secondary hover:shadow-md">
                  {value}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold text-primary">
            We are not a website company. We are not a freelancer agency.
          </h2>
          <p className="mt-4 text-lg font-medium text-secondary">We are a Technology Partner.</p>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
