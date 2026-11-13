import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/logo";

/**
 * Login / register frame: a single floating panel on a softly lit canvas, the
 * way a macOS sign-in sheet sits over the desktop.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-canvas">
      <div
        className="ambient animate-pulse-soft -left-32 -top-32 h-80 w-80 bg-secondary/25"
        aria-hidden
      />
      <div
        className="ambient animate-pulse-soft -bottom-40 -right-24 h-96 w-96 bg-accent/20"
        style={{ animationDelay: "1.5s" }}
        aria-hidden
      />

      <header className="relative px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="press inline-flex items-center gap-2 rounded-lg text-sm font-medium text-muted transition-colors duration-150 hover:text-foreground"
        >
          <Icon name="arrow-left" size={16} />
          <Logo size={28} textClassName="text-base" />
        </Link>
      </header>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-16 pt-2">
        <div className="animate-sheet-in w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
