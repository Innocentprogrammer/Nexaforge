import { MarketingShell } from "@/components/marketing-shell";
import { Card } from "@/components/ui/card";

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
      <section className="mx-auto max-w-4xl px-6 pb-10 pt-20 text-center">
        <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">
          Engineering the Future, Together
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-foreground/70">
          Join a small team building the NexaForge product ecosystem from the ground up —
          real ownership, real impact, from day one.
        </p>
      </section>

      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center font-heading text-2xl font-semibold text-primary">
            Our Hiring Process
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {PIPELINE.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-sm font-semibold text-secondary">
                  {i + 1}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-primary">{step.title}</h3>
                <p className="mt-1 text-xs text-foreground/60">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="font-heading text-2xl font-semibold text-primary">Open Positions</h2>
        <div className="mt-8 space-y-4">
          {OPEN_ROLES.map((role) => (
            <Card key={role.title} className="flex flex-wrap items-center justify-between gap-4">
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
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90"
              >
                Apply
              </a>
            </Card>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
