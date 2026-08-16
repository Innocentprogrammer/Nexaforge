"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/products", label: "Products" },
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/careers", label: "Careers" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-heading text-xl font-semibold tracking-tight text-primary transition-transform duration-200 hover:scale-[1.03]"
        >
          NexaForge
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={isActive}
                className={`nav-underline rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-secondary"
                    : "text-foreground/70 hover:bg-background-subtle hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {!isLoading && user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-background-subtle hover:text-foreground"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10 font-heading text-sm font-semibold text-secondary">
                {(user.full_name || user.email).charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{user.full_name || "Profile"}</span>
            </Link>
          ) : (
            !isLoading && (
              <Link href="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
            )
          )}
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/70 hover:bg-background-subtle"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
