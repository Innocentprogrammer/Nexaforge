import { MarketingShell } from "@/components/marketing-shell";
import { Card } from "@/components/ui/card";

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
      <section className="mx-auto max-w-3xl px-6 pb-10 pt-20 text-center">
        <span className="text-sm font-semibold uppercase tracking-wide text-secondary">
          About NexaForge
        </span>
        <h1 className="mt-3 font-heading text-3xl font-bold text-primary sm:text-4xl">
          Forging the Future of Digital Businesses
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-foreground/70">
          Most technology companies focus on selling software. NexaForge exists to solve
          business problems — whether that&apos;s a couple sending their first digital
          wedding invitation, or an enterprise automating thousands of workflows.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card>
            <h2 className="font-heading text-lg font-semibold text-primary">Our Mission</h2>
            <p className="mt-2 text-sm text-foreground/70">
              To create intelligent, scalable, and beautiful digital products that help
              businesses innovate, automate, and grow.
            </p>
          </Card>
          <Card>
            <h2 className="font-heading text-lg font-semibold text-primary">Our Vision</h2>
            <p className="mt-2 text-sm text-foreground/70">
              A world where every business, regardless of size, has access to world-class
              technology — technology that empowers rather than overwhelms.
            </p>
          </Card>
        </div>
      </section>

      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-center font-heading text-2xl font-semibold text-primary">
            What We Value
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {VALUES.map((value) => (
              <span
                key={value}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground/70"
              >
                {value}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="font-heading text-2xl font-semibold text-primary">
          We are not a website company. We are not a freelancer agency.
        </h2>
        <p className="mt-4 text-lg font-medium text-secondary">We are a Technology Partner.</p>
      </section>
    </MarketingShell>
  );
}
