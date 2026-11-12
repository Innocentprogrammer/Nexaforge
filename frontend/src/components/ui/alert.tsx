import { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

type Tone = "info" | "success" | "warning" | "error";

const tones: Record<Tone, { wrap: string; icon: IconName; iconClass: string; role: string }> = {
  info: {
    wrap: "border-info/25 bg-info/[0.07] text-foreground",
    icon: "info",
    iconClass: "text-info",
    role: "status",
  },
  success: {
    wrap: "border-success/25 bg-success/[0.07] text-foreground",
    icon: "check-circle",
    iconClass: "text-success",
    role: "status",
  },
  warning: {
    wrap: "border-warning/30 bg-warning/[0.09] text-foreground",
    icon: "warning",
    iconClass: "text-warning",
    role: "status",
  },
  error: {
    wrap: "border-error/25 bg-error/[0.07] text-foreground",
    icon: "x-circle",
    iconClass: "text-error",
    role: "alert",
  },
};

/**
 * Inline status banner for messages that must stay on screen (validation,
 * import results, plan notices). Transient confirmations use the Toast instead.
 */
export function Alert({
  tone = "info",
  title,
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone; title?: ReactNode }) {
  const t = tones[tone];
  return (
    <div
      role={t.role}
      className={`animate-scale-in flex gap-3 rounded-xl border px-4 py-3 text-sm ${t.wrap} ${className}`}
      {...props}
    >
      <Icon name={t.icon} size={18} className={`mt-px ${t.iconClass}`} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-heading">{title}</p>}
        <div className={title ? "mt-1 text-foreground/80" : "text-foreground/80"}>{children}</div>
      </div>
    </div>
  );
}
