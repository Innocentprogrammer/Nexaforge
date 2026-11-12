"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

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
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // The header stays transparent over the hero and gains its frosted surface
  // once the page moves — the macOS toolbar behaviour.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        scrolled || menuOpen
          ? "glass border-b border-border shadow-xs"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="press font-heading text-xl font-semibold tracking-tight text-heading"
        >
          NexaForge
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={isActive}
                aria-current={isActive ? "page" : undefined}
                className={`nav-underline rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "text-secondary"
                    : "text-foreground/70 hover:bg-surface-2 hover:text-foreground"
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
              className="flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 text-sm font-medium text-foreground/70 transition-colors duration-150 hover:bg-surface-2 hover:text-foreground"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/10 font-heading text-xs font-semibold text-secondary">
                {(user.full_name || user.email).charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[10rem] truncate sm:inline">
                {user.full_name || "Profile"}
              </span>
            </Link>
          ) : (
            !isLoading && (
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
            )
          )}

          <IconButton
            tip={menuOpen ? "Close menu" : "Open menu"}
            tipBelow
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            className="md:hidden"
          >
            <Icon name={menuOpen ? "x" : "menu"} size={18} />
          </IconButton>
        </div>
      </div>

      {/* Mobile sheet — replaces the horizontally scrolling link row */}
      {menuOpen && (
        <div className="animate-fade-in border-t border-border md:hidden">
          <nav className="mx-auto max-w-6xl px-4 py-3" aria-label="Main">
            <ul className="grid grid-cols-2 gap-1.5">
              {NAV_ITEMS.map((item, i) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                      style={{ animationDelay: `${i * 25}ms` }}
                      className={`animate-fade-in-up flex h-11 items-center justify-between rounded-xl px-3.5 text-sm font-medium transition-colors duration-150 ${
                        isActive
                          ? "bg-secondary/10 text-secondary"
                          : "bg-background-subtle text-foreground/80 hover:bg-surface-2"
                      }`}
                    >
                      {item.label}
                      <Icon name="chevron-right" size={14} className="opacity-50" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {!isLoading && !user && (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="mt-3 block sm:hidden"
              >
                <Button variant="outline" size="lg" className="w-full">
                  Log in
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
