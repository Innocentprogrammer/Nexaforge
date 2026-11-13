"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { LogoMark } from "@/components/logo";

const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/templates", label: "Templates", icon: "templates" },
  { href: "/profile", label: "Profile", icon: "user" },
  { href: "/dashboard/billing", label: "Plan & Billing", icon: "card" },
  { href: "/dashboard/notifications", label: "Notifications", icon: "bell" },
];

const COLLAPSE_KEY = "nexaforge:sidebar-collapsed";
const COLLAPSE_EVENT = "nexaforge:sidebar-collapsed-change";

/**
 * The sidebar's collapsed state lives in localStorage so it survives
 * navigation and reloads. It is read as an external store: the server snapshot
 * is always "expanded", and the client re-reads after hydration.
 */
function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(
    (onChange) => {
      window.addEventListener(COLLAPSE_EVENT, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(COLLAPSE_EVENT, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    () => {
      try {
        return window.localStorage.getItem(COLLAPSE_KEY) === "1";
      } catch {
        return false;
      }
    },
    () => false
  );

  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(
        COLLAPSE_KEY,
        window.localStorage.getItem(COLLAPSE_KEY) === "1" ? "0" : "1"
      );
    } catch {
      /* private mode — the sidebar still toggles for this render */
    }
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }, []);

  return [collapsed, toggle];
}

/** Sub-navigation for the invitation a user is currently inside. */
function invitationSubNav(pathname: string): { href: string; label: string; icon: IconName }[] {
  const match = pathname.match(/^\/invitations\/([^/]+)\/(edit|guests)/);
  if (!match) return [];
  const id = match[1];
  return [
    { href: `/invitations/${id}/edit`, label: "Editor", icon: "edit" },
    { href: `/invitations/${id}/guests`, label: "Guests & RSVPs", icon: "users" },
  ];
}

function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <span className="flex h-9 w-9 items-center justify-center">
        <LogoMark size={32} />
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <LogoMark size={28} />
      <span className="font-heading text-sm font-semibold text-muted">NexaForge</span>
      <span className="text-border-strong">|</span>
      <span className="font-heading text-lg font-semibold tracking-tight text-secondary">
        Invite
      </span>
    </span>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  nested = false,
  onNavigate,
}: {
  item: { href: string; label: string; icon: IconName };
  active: boolean;
  collapsed: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      data-tip={collapsed ? item.label : undefined}
      className={`group relative flex h-9 items-center rounded-lg text-sm font-medium transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
        collapsed ? "tt w-9 justify-center" : "gap-2.5 px-2.5"
      } ${nested && !collapsed ? "ml-3.5 h-8 text-[0.8125rem]" : ""} ${
        active
          ? "bg-secondary/10 text-secondary"
          : "text-foreground/70 hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {/* Active indicator: a short rail on the left edge, not a filled block. */}
      {active && !collapsed && (
        <span
          className="absolute -left-2 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-secondary"
          aria-hidden
        />
      )}
      <Icon name={item.icon} size={nested ? 15 : 18} className={active ? "" : "opacity-80"} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function SidebarBody({
  collapsed,
  pathname,
  onNavigate,
  userIsStaff,
}: {
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
  userIsStaff: boolean;
}) {
  const subNav = invitationSubNav(pathname);

  return (
    <nav className="flex flex-1 flex-col gap-1 px-4" aria-label="Product navigation">
      {[...NAV_ITEMS, ...(userIsStaff ? [{ href: "/dashboard/admin", label: "Administration", icon: "building" as IconName }] : [])].map((item) => {
        const active = pathname === item.href;
        const showSub = item.href === "/dashboard" && subNav.length > 0;
        return (
          <div key={item.href} className="flex flex-col gap-1">
            <NavLink item={item} active={active} collapsed={collapsed} onNavigate={onNavigate} />
            {showSub && (
              <div
                className={`flex flex-col gap-1 ${
                  collapsed ? "" : "border-l border-border pl-0.5"
                }`}
              >
                {!collapsed && (
                  <p className="ml-3.5 mt-1 px-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
                    Current invitation
                  </p>
                )}
                {subNav.map((sub) => (
                  <NavLink
                    key={sub.href}
                    item={sub}
                    active={pathname === sub.href}
                    collapsed={collapsed}
                    nested
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dismiss the account menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const displayName = user?.full_name || user?.email || "";
  const initial = (user?.full_name || user?.email || "?").charAt(0).toUpperCase();
  const sectionLabel =
    NAV_ITEMS.find((item) => item.href === pathname)?.label ??
    (pathname.includes("/admin") ? "Administration" : pathname.includes("/guests") ? "Guests & RSVPs" : pathname.includes("/edit") ? "Editor" : pathname.includes("/notifications") ? "Notifications" : "");

  return (
    <div className="flex min-h-screen flex-1 bg-canvas">
      {/* ---------- Desktop sidebar ---------- */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-background/70 py-5 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:flex ${
          collapsed ? "w-[4.5rem]" : "w-60"
        }`}
      >
        <div className={`mb-6 flex items-center px-4 ${collapsed ? "justify-center" : "gap-2"}`}>
          <Link
            href="/dashboard"
            className="press flex min-w-0 items-center rounded-lg"
            aria-label="NexaInvite dashboard"
          >
            <BrandMark collapsed={collapsed} />
          </Link>
        </div>

        <SidebarBody collapsed={collapsed} pathname={pathname} userIsStaff={Boolean(user?.is_staff)} />

        <div className={`mt-4 flex flex-col gap-1 border-t border-border px-4 pt-4`}>
          <Link
            href="/"
            data-tip={collapsed ? "Back to nexaforge.com" : undefined}
            className={`flex h-9 items-center rounded-lg text-xs font-medium text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-foreground ${
              collapsed ? "tt w-9 justify-center" : "gap-2 px-2.5"
            }`}
          >
            <Icon name="arrow-left" size={16} />
            {!collapsed && <span className="truncate">Back to nexaforge.com</span>}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            data-tip={collapsed ? "Expand sidebar" : undefined}
            className={`flex h-9 items-center rounded-lg text-xs font-medium text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-foreground ${
              collapsed ? "tt w-9 justify-center" : "gap-2 px-2.5"
            }`}
          >
            <Icon name={collapsed ? "chevrons-right" : "chevrons-left"} size={16} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ---------- Mobile drawer ---------- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="animate-fade-in absolute inset-0 bg-[var(--scrim)] backdrop-blur-[2px]"
          />
          <div className="animate-slide-in-left glass-strong absolute inset-y-0 left-0 flex w-[17rem] flex-col border-r border-border py-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between px-4">
              <BrandMark />
              <IconButton
                tip="Close navigation"
                tipBelow
                onClick={() => setMobileOpen(false)}
                size="sm"
              >
                <Icon name="x" size={16} />
              </IconButton>
            </div>
            <SidebarBody
              collapsed={false}
              pathname={pathname}
              userIsStaff={Boolean(user?.is_staff)}
              onNavigate={() => setMobileOpen(false)}
            />
            <div className="mt-4 border-t border-border px-4 pt-4">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <Icon name="arrow-left" size={16} />
                Back to nexaforge.com
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Content column ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-40 border-b border-border">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <IconButton
              tip="Open navigation"
              tipBelow
              onClick={() => setMobileOpen(true)}
              className="sm:hidden"
            >
              <Icon name="menu" size={18} />
            </IconButton>

            <span className="flex items-baseline gap-1.5 sm:hidden">
              <BrandMark />
            </span>

            {sectionLabel && (
              <p className="hidden text-sm font-medium text-foreground/80 sm:block">
                {sectionLabel}
              </p>
            )}

            <div className="relative ml-auto flex items-center gap-2" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 text-sm font-medium text-foreground/80 transition-colors duration-150 hover:bg-surface-2 hover:text-foreground"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/10 font-heading text-xs font-semibold text-secondary">
                  {initial}
                </span>
                <span className="hidden max-w-[12rem] truncate sm:inline">{displayName}</span>
                <Icon
                  name="chevron-down"
                  size={14}
                  className={`text-muted transition-transform duration-200 ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="animate-scale-in glass-strong absolute right-0 top-11 w-64 origin-top-right overflow-hidden rounded-xl border border-border p-1.5 shadow-xl"
                >
                  <div className="px-2.5 py-2">
                    <p className="truncate text-sm font-semibold text-heading">
                      {user?.full_name || "Account"}
                    </p>
                    <p className="truncate text-xs text-muted">{user?.email}</p>
                    {user?.subscription_tier && (
                      <Badge
                        variant={
                          user.subscription_tier === "DIAMOND"
                            ? "success"
                            : user.subscription_tier === "GOLD"
                              ? "warning"
                              : "default"
                        }
                        className="mt-2"
                        dot
                      >
                        {user.subscription_tier} plan
                      </Badge>
                    )}
                  </div>
                  <div className="my-1 border-t border-border" />
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-foreground/80 transition-colors duration-150 hover:bg-surface-2 hover:text-foreground"
                  >
                    <Icon name="user" size={16} />
                    Your profile
                  </Link>
                  <Link
                    href="/"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-foreground/80 transition-colors duration-150 hover:bg-surface-2 hover:text-foreground"
                  >
                    <Icon name="external-link" size={16} />
                    nexaforge.com
                  </Link>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-error transition-colors duration-150 hover:bg-error/10"
                  >
                    <Icon name="logout" size={16} />
                    Log out
                  </button>
                </div>
              )}

              {/* Kept reachable without opening the menu, as before. */}
              <Button variant="outline" size="sm" onClick={handleLogout} className="hidden lg:inline-flex">
                Log out
              </Button>
            </div>
          </div>
        </header>

        <main key={pathname} className="page-enter flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
