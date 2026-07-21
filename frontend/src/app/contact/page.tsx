"use client";

import { FormEvent, useState } from "react";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

const CHANNELS = [
  { label: "Business Email", value: "hello@nexaforge.com", href: "mailto:hello@nexaforge.com" },
  { label: "Sales Inquiry", value: "hello@nexaforge.com", href: "mailto:hello@nexaforge.com?subject=Sales%20Inquiry" },
  { label: "LinkedIn", value: "linkedin.com/company/nexaforge", href: "#" },
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
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">
              Let&apos;s Talk
            </h1>
            <p className="mt-4 text-lg text-foreground/70">
              Tell us about your project, or ask about NexaInvite — we respond within one
              business day.
            </p>

            <div className="mt-10 space-y-4">
              {CHANNELS.map((channel) => (
                <div key={channel.label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                    {channel.label}
                  </p>
                  <a href={channel.href} className="text-sm font-medium text-secondary">
                    {channel.value}
                  </a>
                </div>
              ))}
            </div>
          </div>

          <Card>
            {status === "done" ? (
              <div className="py-8 text-center">
                <h2 className="font-heading text-lg font-semibold text-primary">
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

                <Button type="submit" variant="primary" className="w-full" disabled={status === "submitting"}>
                  {status === "submitting" ? "Sending…" : "Send Message"}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </section>
    </MarketingShell>
  );
}
