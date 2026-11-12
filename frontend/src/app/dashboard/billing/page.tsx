"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type CurrentSubscription = {
  id: string;
  plan: { code: string; name: string; amount: number; currency: string; duration_days: number; features: string[] };
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  duration_days: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type Payment = {
  id: string;
  plan_name: string;
  amount: number;
  amount_rupees: number;
  currency: string;
  status: "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED";
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  failure_reason: string;
  created_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function paymentBadge(status: Payment["status"]) {
  if (status === "CAPTURED") return "success" as const;
  if (status === "FAILED" || status === "REFUNDED") return "error" as const;
  return "warning" as const;
}

function BillingContent() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<{ success: boolean; data: CurrentSubscription | null }>("/subscriptions/me/"),
      api.get<{ success: boolean; data: Payment[] }>("/payments/history/"),
    ])
      .then(([current, history]) => {
        setSubscription(current.data);
        setPayments(history.data);
      })
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : "Could not load billing information."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: "NexaInvite", href: "/dashboard" }, { label: "Billing" }]}
        title="Plan & Billing"
        description="View your current subscription and previous payments."
        actions={<Link href="/pricing"><Button><Icon name="sparkles" size={16} />Explore plans</Button></Link>}
      />

      {error && <Alert tone="error">{error}</Alert>}
      {loading ? <Skeleton className="h-48 rounded-xl" /> : (
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Current plan</p>
              <h2 className="mt-1 font-heading text-2xl font-semibold text-heading">{subscription?.plan.name ?? (user?.subscription_tier === "DIAMOND" ? "Diamond" : user?.subscription_tier === "GOLD" ? "Gold" : "Normal")}</h2>
              <p className="mt-1 text-sm text-muted">{subscription ? `${subscription.duration_days}-day subscription` : "Free account"}</p>
            </div>
            <Badge variant={subscription?.status === "ACTIVE" ? "success" : "default"} dot>{subscription?.status ?? user?.subscription_tier ?? "NORMAL"}</Badge>
          </div>
          {subscription ? (
            <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
              <div><p className="text-xs text-muted">Started</p><p className="mt-1 font-medium text-heading">{formatDate(subscription.starts_at)}</p></div>
              <div><p className="text-xs text-muted">Expires</p><p className="mt-1 font-medium text-heading">{formatDate(subscription.ends_at)}</p></div>
              <div><p className="text-xs text-muted">Plan price</p><p className="mt-1 font-medium text-heading">₹{(subscription.plan.amount / 100).toLocaleString("en-IN")}</p></div>
            </div>
          ) : (
            <p className="border-t border-border pt-5 text-sm text-muted">You are currently using the Normal plan. Choose Gold or Diamond whenever you need additional features.</p>
          )}
          {subscription?.plan.features?.length ? <div className="flex flex-wrap gap-2">{subscription.plan.features.map((feature) => <span key={feature} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-foreground/75">{feature}</span>)}</div> : null}
        </Card>
      )}

      <section className="space-y-4">
        <div><h2 className="font-heading text-lg font-semibold text-heading">Payment history</h2><p className="mt-1 text-sm text-muted">Your latest 100 payment attempts.</p></div>
        {loading ? <Skeleton className="h-56 rounded-xl" /> : payments.length === 0 ? (
          <Card className="py-10 text-center"><Icon name="inbox" size={28} className="mx-auto text-muted" /><p className="mt-3 font-medium text-heading">No payments yet</p><p className="mt-1 text-sm text-muted">Paid subscription purchases will appear here.</p></Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-border bg-background-subtle text-xs uppercase tracking-wide text-muted"><tr><th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Plan</th><th className="px-5 py-3 font-medium">Amount</th><th className="px-5 py-3 font-medium">Payment ID</th><th className="px-5 py-3 font-medium">Status</th></tr></thead>
                <tbody className="divide-y divide-border">{payments.map((payment) => <tr key={payment.id}><td className="px-5 py-4 text-muted">{formatDate(payment.created_at)}</td><td className="px-5 py-4 font-medium text-heading">{payment.plan_name}</td><td className="px-5 py-4">₹{payment.amount_rupees.toLocaleString("en-IN")}</td><td className="px-5 py-4 font-mono text-xs text-muted">{payment.gateway_payment_id ?? payment.gateway_order_id ?? "—"}</td><td className="px-5 py-4"><Badge variant={paymentBadge(payment.status)} dot>{payment.status}</Badge>{payment.failure_reason && <p className="mt-1 max-w-xs text-xs text-error">{payment.failure_reason}</p>}</td></tr>)}</tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

export default function BillingPage() {
  return <ProtectedRoute><DashboardShell><BillingContent /></DashboardShell></ProtectedRoute>;
}
