"use client";

import { FormEvent, useState } from "react";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Icon, type IconName } from "@/components/ui/icon";
import { api, ApiError } from "@/lib/api";

const CHANNELS: { icon: IconName; label: string; value: string; href: string }[] = [
  {
    icon: "mail",
    label: "Business Email",
    value: "hello@nexaforge.com",
    href: "mailto:hello@nexaforge.com",
  },
  {
    icon: "card",
    label: "Sales Inquiry",
    value: "hello@nexaforge.com",
    href: "mailto:hello@nexaforge.com?subject=Sales%20Inquiry",
  },
  {
    icon: "linkedin",
    label: "LinkedIn",
    value: "linkedin.com/company/nexaforge",
    href: "#",
  },
];

export default function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await api.post(
        "/leads/",
        { full_name: fullName, email, company, message, source: "CONTACT_PAGE" },
        { auth: false }
      );
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <MarketingShell>
      <section className="relative overflow-hidden">
        <div className="ambient animate-pulse-soft -right-20 top-0 h-72 w-72 bg-secondary/20" aria-hidden />
        <div
          className="ambient animate-pulse-soft -left-20 bottom-0 h-64 w-64 bg-accent/20"
          style={{ animationDelay: "1.2s" }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="animate-fade-in-up">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-heading sm:text-4xl">
                Let&apos;s Talk
              </h1>
              <p className="mt-5 text-lg leading-8 text-foreground/70">
                Tell us about your project, or ask about NexaInvite — we respond within one business
                day.
              </p>

              <div className="mt-10 space-y-3">
                {CHANNELS.map((channel) => (
                  <a
                    key={channel.label}
                    href={channel.href}
                    className="card-hover flex items-center gap-3.5 rounded-xl border border-border bg-background p-3.5 shadow-2xs"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/15">
                      <Icon name={channel.icon} size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
                        {channel.label}
                      </span>
                      <span className="block truncate text-sm font-medium text-secondary">
                        {channel.value}
                      </span>
                    </span>
                    <Icon name="arrow-up-right" size={16} className="ml-auto text-muted" />
                  </a>
                ))}
              </div>
            </div>

            <Card
              className="animate-fade-in-up p-6 shadow-lg sm:p-7"
              style={{ animationDelay: "150ms" }}
            >
              {status === "done" ? (
                <div className="animate-scale-in py-10 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success ring-1 ring-inset ring-success/20">
                    <Icon name="check-circle" size={24} />
                  </span>
                  <h2 className="mt-5 font-heading text-lg font-semibold text-heading">
                    Message sent
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Thanks, {fullName || "there"} — we&apos;ll be in touch within one business day.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="font-heading text-lg font-semibold text-heading">
                    Send us a message
                  </h2>
                  <p className="mt-1.5 text-sm text-muted">
                    We read every one — no auto-responders.
                  </p>
                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                      <Label htmlFor="full_name">Full name</Label>
                      <Input
                        id="full_name"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="company">Company (optional)</Label>
                      <Input
                        id="company"
                        autoComplete="organization"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">How can we help?</Label>
                      <Textarea
                        id="message"
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                      />
                    </div>

                    {error && <Alert tone="error">{error}</Alert>}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      disabled={status === "submitting"}
                      loading={status === "submitting"}
                    >
                      {status === "submitting" ? "Sending…" : "Send Message"}
                    </Button>
                  </form>
                </>
              )}
            </Card>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
