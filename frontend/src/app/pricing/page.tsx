import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";

const PRICING_FAQS = [
  {
    q: "Can I switch plans later?",
    a: "Yes — upgrade or downgrade anytime from your account. Changes apply on your next billing cycle, no long-term lock-in.",
  },
  {
    q: "What happens if I go over my guest limit?",
    a: "We'll notify you before you hit the cap. You can upgrade to the next tier in a couple of clicks to keep collecting RSVPs.",
  },
  {
    q: "Is there a refund policy?",
    a: "Yes. Contact us within 14 days of a paid upgrade for a full refund, no questions asked.",
  },
];

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything you need to publish your first event.",
    features: [
      "Unlimited draft invitations",
      "All free templates",
      "Up to 50 guests per event",
      "RSVP tracking & guest list",
      "Shareable link + QR code",
    ],
    cta: "Launch App",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    description: "For larger events and premium designs.",
    features: [
      "Everything in Free",
      "All premium templates included",
      "Up to 500 guests per event",
      "Priority email support",
    ],
    cta: "Start Pro",
    href: "/register",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$29",
    period: "/month",
    description: "For teams running events at scale.",
    features: [
      "Everything in Pro",
      "Unlimited guests",
      "Dedicated onboarding",
      "Custom domain (coming soon)",
    ],
    cta: "Talk to Sales",
    href: "/contact",
    highlighted: false,
  },
];

export default function PricingPage() {
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
          <h1 className="animate-fade-in-up font-heading text-3xl font-bold text-primary sm:text-4xl">
            Simple, Transparent Pricing
          </h1>
          <p
            className="animate-fade-in-up mx-auto mt-4 max-w-xl text-lg text-foreground/70"
            style={{ animationDelay: "100ms" }}
          >
            Pricing shown below is for NexaInvite. As more NexaForge products launch, each
            will appear here with its own plans — one account, one bill.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 100}>
              <div className={tier.highlighted ? "sm:-translate-y-2" : ""}>
                <Card
                  className={`card-hover h-full ${
                    tier.highlighted ? "border-secondary shadow-lg ring-1 ring-secondary" : ""
                  }`}
                >
                  {tier.highlighted && <Badge variant="success">Most Popular</Badge>}
                  <h2 className="mt-3 font-heading text-lg font-semibold text-primary">
                    {tier.name}
                  </h2>
                  <p className="mt-3 flex items-baseline gap-1">
                    <span className="font-heading text-3xl font-bold text-primary">
                      {tier.price}
                    </span>
                    <span className="text-sm text-foreground/50">{tier.period}</span>
                  </p>
                  <p className="mt-2 text-sm text-foreground/60">{tier.description}</p>
                  <ul className="mt-6 space-y-2">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm text-foreground/70">
                        <span className="text-success">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={tier.href} className="mt-8 block">
                    <Button variant={tier.highlighted ? "primary" : "outline"} className="w-full">
                      {tier.cta}
                    </Button>
                  </Link>
                </Card>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-background-subtle">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <Reveal>
            <h2 className="text-center font-heading text-2xl font-semibold text-primary sm:text-3xl">
              Pricing questions
            </h2>
          </Reveal>
          <div className="mt-10 space-y-6">
            {PRICING_FAQS.map((faq, i) => (
              <Reveal key={faq.q} delay={i * 80}>
                <Card className="bg-background">
                  <h3 className="font-heading text-base font-semibold text-primary">{faq.q}</h3>
                  <p className="mt-2 text-sm text-foreground/70">{faq.a}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
