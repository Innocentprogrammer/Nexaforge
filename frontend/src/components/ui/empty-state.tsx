import { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

/**
 * Minimal empty state: a quiet icon, one line of what's missing, one line of
 * what to do about it, and the action itself.
 */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className = "",
  compact = false,
}: {
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 text-center ${
        compact ? "py-10" : "py-16"
      } ${className}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background-subtle text-muted shadow-2xs">
        <Icon name={icon} size={24} />
      </span>
      <p className="mt-4 font-heading text-base font-semibold text-heading">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
