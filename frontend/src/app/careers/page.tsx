import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Card, Badge } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";

const BENEFITS: { icon: IconName; title: string; description: string }[] = [
  { icon: "cloud", title: "Remote-first", description: "Work from anywhere, async by default." },
  { icon: "clock", title: "Flexible hours", description: "Own your schedule around real output." },
  { icon: "diamond", title: "Equity", description: "Meaningful ownership in what you help build." },
  { icon: "award", title: "Learning budget", description: "Courses, books, and conferences, covered." },
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
        <div className="ambient animate-pulse-soft -right-20 -top-20 h-80 w-80 bg-secondary/20" aria-hidden />
        <div
          className="ambient animate-pulse-soft -left-20 top-1/2 h-64 w-64 bg-accent/20"
          style={{ animationDelay: "1.2s" }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-4 pb-12 pt-20 text-center sm:px-6">
          <h1 className="animate-fade-in-up font-heading text-3xl font-bold tracking-tight text-heading sm:text-4xl">
            Engineering the Future, Together
          </h1>
          <p
            className="animate-fade-in-up mx-auto mt-5 max-w-2xl text-lg leading-8 text-foreground/70"
            style={{ animationDelay: "100ms" }}
          >
            Join a small team building the NexaForge product ecosystem from the ground up — real
            ownership, real impact, from day one.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {BENEFITS.map((benefit, i) => (
            <Reveal key={benefit.title} delay={i * 80}>
              <Card interactive className="h-full p-5 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/15">
                  <Icon name={benefit.icon} size={18} />
                </span>
                <h3 className="mt-4 font-heading text-sm font-semibold text-heading">
                  {benefit.title}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-muted">{benefit.description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <Reveal>
            <h2 className="text-center font-heading text-2xl font-semibold tracking-tight text-heading">
              Our Hiring Process
            </h2>
          </Reveal>
          <ol className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {PIPELINE.map((step, i) => (
              <li key={step.title}>
                <Reveal delay={i * 80} className="text-center">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-secondary/20 bg-background font-heading text-sm font-semibold text-secondary shadow-2xs">
                    {i + 1}
                  </div>
                  <h3 className="mt-3.5 text-sm font-semibold text-heading">{step.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted">{step.description}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-heading">
            Open Positions
          </h2>
          <p className="mt-2 text-sm text-muted">
            {OPEN_ROLES.length} roles open — all remote, all full-time.
          </p>
        </Reveal>
        <div className="mt-8 space-y-4">
          {OPEN_ROLES.map((role, i) => (
            <Reveal key={role.title} delay={i * 100}>
              <Card interactive className="flex flex-wrap items-center justify-between gap-5">
                <div className="min-w-0">
                  <h3 className="font-heading text-base font-semibold text-heading">
                    {role.title}
                  </h3>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="map-pin" size={13} />
                      {role.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="clock" size={13} />
                      {role.type}
                    </span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {role.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                </div>
                <a
                  href={`mailto:hello@nexaforge.com?subject=${encodeURIComponent(
                    `Application: ${role.title}`
                  )}`}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground shadow-xs transition-all duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-px hover:bg-secondary-hover hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
                >
                  <Icon name="mail" size={16} />
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
