"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/templates", label: "Templates" },
  { href: "/profile", label: "Profile" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="hidden w-56 flex-col border-r border-border px-4 py-6 sm:flex">
        <Link href="/dashboard" className="mb-1 flex items-baseline gap-1.5 px-2">
          <span className="font-heading text-sm font-semibold text-foreground/50">NexaForge</span>
          <span className="text-foreground/30">|</span>
          <span className="font-heading text-lg font-semibold text-secondary">Invite</span>
        </Link>
        <Link href="/" className="mb-7 px-2 text-xs text-foreground/40 hover:text-foreground/60">
          ← Back to nexaforge.com
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === item.href
                  ? "bg-secondary/10 text-secondary"
                  : "text-foreground/70 hover:bg-background-subtle"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="flex items-baseline gap-1.5 sm:hidden">
            <span className="font-heading text-sm font-semibold text-foreground/50">NexaForge</span>
            <span className="text-foreground/30">|</span>
            <span className="font-heading text-lg font-semibold text-secondary">Invite</span>
          </span>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-foreground/70">{user?.full_name || user?.email}</span>
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </header>
        <main className="flex-1 animate-fade-in px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
