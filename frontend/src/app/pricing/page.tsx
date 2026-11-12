"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Plan = {
  id: number;
  code: "NORMAL" | "GOLD" | "DIAMOND";
  name: string;
  description: string;
  amount: number;
  amount_rupees: number;
  currency: string;
  duration_days: number;
  features: string[];
};

type OrderResponse = {
  success: boolean;
  data: {
    order_id: string;
    amount: number;
    currency: string;
    key_id: string;
    plan: Plan;
  };
};

type RazorpayResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PRICING_FAQS = [
  { q: "Can I switch plans later?", a: "You can purchase a higher tier whenever you need its features. The new plan becomes active after payment is verified." },
  { q: "How long does a paid plan last?", a: "Gold and Diamond plans are currently sold in 30-day periods. You can renew by purchasing again." },
  { q: "Is my payment secure?", a: "Checkout is handled by Razorpay. NexaInvite verifies the payment signature on the server before activating a paid plan." },
];

export default function PricingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get<{ success: boolean; data: Plan[] }>("/subscription-plans/", { auth: false })
      .then((response) => setPlans(response.data))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load plans."))
      .finally(() => setLoading(false));
  }, []);

  const choosePlan = async (plan: Plan) => {
    setMessage("");
    if (plan.code === "NORMAL") {
      router.push(user ? "/dashboard" : "/register");
      return;
    }
    if (!user) {
      router.push("/login?next=/pricing");
      return;
    }
    if (!checkoutReady || !window.Razorpay) {
      setMessage("Payment checkout is still loading. Please try again in a moment.");
      return;
    }

    setBusyPlan(plan.code);
    try {
      const order = await api.post<OrderResponse>("/payments/create-order/", { plan_code: plan.code });
      const checkout = new window.Razorpay({
        key: order.data.key_id,
        amount: order.data.amount,
        currency: order.data.currency,
        name: "NexaInvite",
        description: `${plan.name} subscription`,
        order_id: order.data.order_id,
        prefill: { name: user.full_name, email: user.email, contact: user.phone },
        theme: { color: "#7c3aed" },
        event: {
          "payment.failed": (response: { error?: { description?: string } }) => {
            setMessage(response.error?.description || "Payment failed. Please try again.");
            setBusyPlan(null);
          },
        },
        handler: async (result: RazorpayResult) => {
          try {
            await api.post("/payments/verify/", result);
            await refreshUser();
            setMessage(`${plan.name} plan activated successfully.`);
          } catch (error) {
            setMessage(error instanceof ApiError ? error.message : "Payment verification failed. If money was deducted, contact support.");
          } finally {
            setBusyPlan(null);
          }
        },
        modal: { ondismiss: () => setBusyPlan(null) },
      });
      checkout.open();
    } catch (error) {
      setBusyPlan(null);
      setMessage(error instanceof ApiError ? error.message : "Unable to start checkout. Please try again.");
    }
  };

  return (
    <MarketingShell>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setCheckoutReady(true)}
        onError={() => setMessage("Payment checkout could not be loaded. Please refresh the page.")}
      />
      <section className="relative overflow-hidden">
        <div className="ambient animate-pulse-soft -right-20 -top-20 h-80 w-80 bg-secondary/20" aria-hidden />
        <div className="ambient animate-pulse-soft -left-20 top-1/2 h-64 w-64 bg-accent/20" style={{ animationDelay: "1.2s" }} aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 pb-12 pt-20 text-center sm:px-6">
          <h1 className="animate-fade-in-up font-heading text-3xl font-bold tracking-tight text-heading sm:text-4xl">Simple, Transparent Pricing</h1>
          <p className="animate-fade-in-up mx-auto mt-5 max-w-xl text-lg leading-8 text-foreground/70" style={{ animationDelay: "100ms" }}>
            Choose the NexaInvite plan that matches your event. Paid features unlock only after the payment is verified.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {message && <div role="status" className="mb-6 rounded-lg border border-border bg-background-subtle p-4 text-center text-sm">{message}</div>}
        {loading ? <p className="py-12 text-center text-muted">Loading plans…</p> : (
          <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-3">
            {plans.map((plan, index) => {
              const highlighted = plan.code === "GOLD";
              return (
                <Reveal key={plan.code} delay={index * 100}>
                  <div className={highlighted ? "sm:-translate-y-3" : ""}>
                    <Card interactive className={`h-full ${highlighted ? "border-secondary/40 shadow-lg ring-1 ring-secondary/25" : ""}`}>
                      <div className="flex h-6 items-center">{highlighted && <Badge variant="brand"><Icon name="sparkles" size={13} />Most Popular</Badge>}</div>
                      <h2 className="mt-4 font-heading text-lg font-semibold text-heading">{plan.name}</h2>
                      <p className="mt-3 flex items-baseline gap-1.5">
                        <span className="font-heading text-4xl font-bold tracking-tight text-heading">{plan.amount === 0 ? "Free" : `₹${plan.amount_rupees.toLocaleString("en-IN")}`}</span>
                        <span className="text-sm text-muted">{plan.amount === 0 ? "forever" : `/${plan.duration_days} days`}</span>
                      </p>
                      <p className="mt-2.5 text-sm leading-6 text-muted">{plan.description}</p>
                      <ul className="mt-7 space-y-2.5">
                        {plan.features.map((feature) => <li key={feature} className="flex items-start gap-2.5 text-sm leading-6 text-foreground/70"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"><Icon name="check" size={13} strokeWidth={2.25} /></span>{feature}</li>)}
                      </ul>
                      <Button onClick={() => choosePlan(plan)} disabled={busyPlan !== null} variant={highlighted ? "primary" : "outline"} size="lg" className="mt-8 w-full">
                        {busyPlan === plan.code ? "Preparing checkout…" : plan.code === "NORMAL" ? "Launch App" : `Choose ${plan.name}`}
                      </Button>
                    </Card>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
        {!user && <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link className="text-secondary underline" href="/login">Log in</Link> before purchasing a paid plan.</p>}
      </section>

      <section className="border-t border-border bg-background-subtle">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal><h2 className="text-center font-heading text-2xl font-semibold tracking-tight text-heading sm:text-3xl">Pricing questions</h2></Reveal>
          <div className="mt-12 space-y-4">{PRICING_FAQS.map((faq, index) => <Reveal key={faq.q} delay={index * 80}><Card interactive className="bg-background"><h3 className="flex items-start gap-2.5 font-heading text-base font-semibold text-heading"><Icon name="info" size={18} className="mt-0.5 text-secondary" />{faq.q}</h3><p className="mt-2.5 pl-[1.8rem] text-sm leading-6 text-muted">{faq.a}</p></Card></Reveal>)}</div>
        </div>
      </section>
    </MarketingShell>
  );
}
