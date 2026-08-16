import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Card } from "@/components/ui/card";

const BENEFITS = [
  { icon: "◎", title: "Remote-first", description: "Work from anywhere, async by default." },
  { icon: "⏱", title: "Flexible hours", description: "Own your schedule around real output." },
  { icon: "◆", title: "Equity", description: "Meaningful ownership in what you help build." },
  { icon: "✦", title: "Learning budget", description: "Courses, books, and conferences, covered." },
];

const PIPELINE = [
  { title: "Job Listing", description: "Find your specialty in the Forge." },
  { title: "Application", description: "Submit your background and portfolio." },
  { title: "Resume Screening", description: "Initial fit and experience review." },
  { title: "Technical Assessment", description: "A practical, role-relevant exercise." },
  { title: "Interview", description: "A deeper conversation with the team." },
  { title: "Offer", description: "Welcome to NexaForge." },
];

const OPEN_ROLES = [
  {
    title: "Senior Full-Stack Engineer",
    location: "Remote",
    type: "Full-time",
    tags: ["Next.js", "Django", "TypeScript"],
  },
  {
    title: "Product Designer",
    location: "Remote",
    type: "Full-time",
    tags: ["Design Systems", "Figma"],
  },
  {
    title: "DevOps Engineer",
    location: "Remote",
    type: "Full-time",
    tags: ["Docker", "PostgreSQL", "CI/CD"],
  },
];

export default function CareersPage() {
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
          <h1 className="animate-fade-in-up font-heading text-3xl font-bold text-primary sm:text-4xl">
            Engineering the Future, Together
          </h1>
          <p
            className="animate-fade-in-up mx-auto mt-4 max-w-2xl text-lg text-foreground/70"
            style={{ animationDelay: "100ms" }}
          >
            Join a small team building the NexaForge product ecosystem from the ground up —
            real ownership, real impact, from day one.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {BENEFITS.map((benefit, i) => (
            <Reveal key={benefit.title} delay={i * 80}>
              <Card className="card-hover h-full text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-lg text-secondary">
                  {benefit.icon}
                </span>
                <h3 className="mt-3 font-heading text-sm font-semibold text-primary">
                  {benefit.title}
                </h3>
                <p className="mt-1 text-xs text-foreground/60">{benefit.description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <Reveal>
            <h2 className="text-center font-heading text-2xl font-semibold text-primary">
              Our Hiring Process
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {PIPELINE.map((step, i) => (
              <Reveal key={step.title} delay={i * 80} className="text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-sm font-semibold text-secondary">
                  {i + 1}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-primary">{step.title}</h3>
                <p className="mt-1 text-xs text-foreground/60">{step.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold text-primary">Open Positions</h2>
        </Reveal>
        <div className="mt-8 space-y-4">
          {OPEN_ROLES.map((role, i) => (
            <Reveal key={role.title} delay={i * 100}>
              <Card className="card-hover flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading text-base font-semibold text-primary">
                    {role.title}
                  </h3>
                  <p className="mt-1 text-xs text-foreground/50">
                    {role.location} · {role.type}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {role.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-background-subtle px-2.5 py-0.5 text-xs text-foreground/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <a
                  href={`mailto:hello@nexaforge.com?subject=${encodeURIComponent(
                    `Application: ${role.title}`
                  )}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-secondary/90 active:scale-[0.97]"
                >
                  Apply
                </a>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
