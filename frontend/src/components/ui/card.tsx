import { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

/**
 * A surface that sits on the canvas: hairline border, 14px radius, one soft
 * shadow. Depth comes from the border + shadow pair, never from a heavy drop
 * shadow — pass `interactive` for the lift-on-hover treatment used by
 * clickable tiles.
 */
export function Card({
  className = "",
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-border bg-background p-6 shadow-sm ${
        interactive ? "card-hover" : ""
      } ${className}`}
      {...props}
    />
  );
}

/** Title + optional description and trailing actions, spaced consistently. */
export function CardHeader({
  title,
  description,
  actions,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="font-heading text-base font-semibold text-heading">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-border ${className}`} />;
}

/**
 * Status badge. Soft tint + hairline ring rather than a saturated block, so a
 * dense table of them still reads calmly.
 */
type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "brand";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-surface-2 text-muted ring-border",
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/10 text-warning ring-warning/20",
  error: "bg-error/10 text-error ring-error/20",
  info: "bg-info/10 text-info ring-info/20",
  brand: "bg-secondary/10 text-secondary ring-secondary/20",
};

export function Badge({
  className = "",
  variant = "default",
  dot = false,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant; dot?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeVariants[variant]} ${className}`}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />}
      {props.children}
    </span>
  );
}

/**
 * Metric tile: large tabular number, small supporting label, quiet icon.
 * `tone` colours the number only — the surface stays neutral.
 */
export function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
  icon?: IconName;
  tone?: "neutral" | "brand" | "success" | "warning" | "error";
}) {
  const toneClasses = {
    neutral: "text-heading",
    brand: "text-secondary",
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
  }[tone];

  const iconTone = {
    neutral: "bg-surface-2 text-muted",
    brand: "bg-secondary/10 text-secondary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-error/10 text-error",
  }[tone];

  return (
    <div
      className={`card-hover rounded-xl border border-border bg-background p-4 shadow-sm sm:p-5 ${className}`}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        {icon && (
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconTone}`}>
            <Icon name={icon} size={14} />
          </span>
        )}
      </div>
      <p className={`mt-2 font-heading text-2xl font-semibold tabular-nums ${toneClasses}`}>
        {value}
      </p>
    </div>
  );
}
