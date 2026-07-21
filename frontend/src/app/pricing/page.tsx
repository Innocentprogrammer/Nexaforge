import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";

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
      <section className="mx-auto max-w-3xl px-6 pb-10 pt-20 text-center">
        <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">
          Simple, Transparent Pricing
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-foreground/70">
          Pricing shown below is for NexaInvite. As more NexaForge products launch, each
          will appear here with its own plans — one account, one bill.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={tier.highlighted ? "border-secondary ring-1 ring-secondary" : ""}
            >
              {tier.highlighted && <Badge variant="success">Most Popular</Badge>}
              <h2 className="mt-3 font-heading text-lg font-semibold text-primary">
                {tier.name}
              </h2>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="font-heading text-3xl font-bold text-primary">{tier.price}</span>
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
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
