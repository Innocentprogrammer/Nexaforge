"use client";

import { FormEvent, useState } from "react";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

const CHANNELS = [
  { icon: "✉", label: "Business Email", value: "hello@nexaforge.com", href: "mailto:hello@nexaforge.com" },
  {
    icon: "◆",
    label: "Sales Inquiry",
    value: "hello@nexaforge.com",
    href: "mailto:hello@nexaforge.com?subject=Sales%20Inquiry",
  },
  { icon: "in", label: "LinkedIn", value: "linkedin.com/company/nexaforge", href: "#" },
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
        <div
          className="animate-pulse-soft pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-secondary/20 blur-3xl"
          aria-hidden
        />
        <div
          className="animate-pulse-soft pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
          style={{ animationDelay: "1.2s" }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-6 py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="animate-fade-in-up">
              <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">
                Let&apos;s Talk
              </h1>
              <p className="mt-4 text-lg text-foreground/70">
                Tell us about your project, or ask about NexaInvite — we respond within one
                business day.
              </p>

              <div className="mt-10 space-y-4">
                {CHANNELS.map((channel) => (
                  <a
                    key={channel.label}
                    href={channel.href}
                    className="card-hover flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-sm font-semibold text-secondary">
                      {channel.icon}
                    </span>
                    <span>
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                        {channel.label}
                      </p>
                      <span className="text-sm font-medium text-secondary">{channel.value}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <Card className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
              {status === "done" ? (
                <div className="animate-fade-in-up py-8 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-2xl text-success">
                    ✓
                  </span>
                  <h2 className="mt-4 font-heading text-lg font-semibold text-primary">
                    Message sent
                  </h2>
                  <p className="mt-2 text-sm text-foreground/60">
                    Thanks, {fullName || "there"} — we&apos;ll be in touch within one business day.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Full name</Label>
                    <Input
                      id="full_name"
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company (optional)</Label>
                    <Input
                      id="company"
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

                  {error && <p className="text-sm text-error">{error}</p>}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={status === "submitting"}
                  >
                    {status === "submitting" ? "Sending…" : "Send Message"}
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
