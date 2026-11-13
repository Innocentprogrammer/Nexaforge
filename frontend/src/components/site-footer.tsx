"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon, type IconName } from "@/components/ui/icon";
import { Logo } from "@/components/logo";

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/products/nexainvite", label: "NexaInvite" },
      { href: "/products", label: "All Products" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/products/nexainvite", label: "Templates" },
      { href: "/contact", label: "Support" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/contact", label: "Privacy Policy" },
      { href: "/contact", label: "Terms of Service" },
    ],
  },
];

const SOCIALS: { label: string; icon: IconName; href: string }[] = [
  { label: "LinkedIn", icon: "linkedin", href: "#" },
  { label: "X", icon: "message", href: "#" },
  { label: "Instagram", icon: "sparkles", href: "#" },
];

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setState("submitting");
    try {
      await api.post("/leads/", { email, source: "NEWSLETTER" }, { auth: false });
      setState("done");
      setEmail("");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <p className="animate-scale-in inline-flex items-center gap-2 rounded-lg border border-success/25 bg-success/[0.07] px-3 py-2 text-sm font-medium text-success">
        <Icon name="check-circle" size={16} />
        Subscribed — thanks for joining.
      </p>
    );
  }

  return (
    <div className="max-w-sm">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-label="Email address"
          aria-invalid={state === "error" || undefined}
          data-state={state === "error" ? "error" : undefined}
        />
        <Button type="submit" loading={state === "submitting"}>
          {state === "submitting" ? "Joining…" : "Subscribe"}
        </Button>
      </form>
      {state === "error" && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-error">
          <Icon name="warning" size={13} />
          That didn&apos;t go through. Please try again.
        </p>
      )}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background-subtle">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-2">
            <Link
              href="/"
              aria-label="NexaForge home"
              className="press inline-block rounded-lg"
            >
              <Logo size={30} textClassName="text-lg" />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted">
              Forging the Future of Digital Businesses. Engineering-grade SaaS products, starting
              with NexaInvite.
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  data-tip={social.label}
                  className="tt tt-below flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted shadow-2xs transition-all duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-border-strong hover:text-foreground hover:shadow-sm"
                >
                  <Icon name={social.icon} size={16} />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/70 transition-colors duration-150 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-border pt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
              Stay in the loop
            </h3>
            <p className="mt-1.5 text-sm text-muted">
              Product updates from across the NexaForge suite, a few times a month.
            </p>
            <div className="mt-3">
              <NewsletterForm />
            </div>
          </div>
          <p className="text-xs text-muted/80">
            © {new Date().getFullYear()} NexaForge Technologies. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
