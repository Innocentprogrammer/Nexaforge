"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

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

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setState("submitting");
    try {
      await api.post(
        "/leads/",
        { email, source: "NEWSLETTER" },
        { auth: false }
      );
      setState("done");
      setEmail("");
    } catch (err) {
      setState("error");
    }
  };

  if (state === "done") {
    return <p className="text-sm text-success">Subscribed — thanks for joining.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
      />
      <button
        type="submit"
        disabled={state === "submitting"}
        className="whitespace-nowrap rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-50"
      >
        {state === "submitting" ? "Joining…" : "Subscribe"}
      </button>
    </form>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background-subtle">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="font-heading text-lg font-semibold text-primary">
              NexaForge
            </Link>
            <p className="mt-3 max-w-xs text-sm text-foreground/60">
              Forging the Future of Digital Businesses. Engineering-grade SaaS products,
              starting with NexaInvite.
            </p>
            <div className="mt-4 flex gap-3 text-sm text-foreground/50">
              <a href="#" className="hover:text-foreground">LinkedIn</a>
              <a href="#" className="hover:text-foreground">X</a>
              <a href="#" className="hover:text-foreground">Instagram</a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                {col.heading}
              </h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-foreground/70 hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Stay in the loop
            </h3>
            <p className="mt-1 text-sm text-foreground/60">
              Product updates from across the NexaForge suite, a few times a month.
            </p>
            <div className="mt-3">
              <NewsletterForm />
            </div>
          </div>
          <p className="text-xs text-foreground/40">
            © {new Date().getFullYear()} NexaForge Technologies. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
