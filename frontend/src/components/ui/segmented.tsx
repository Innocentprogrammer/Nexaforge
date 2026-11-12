"use client";

import { Icon, type IconName } from "@/components/ui/icon";

export interface SegmentedOption {
  value: string;
  label: string;
  icon?: IconName;
}

/**
 * macOS-style segmented control, used for filters and view switches. The
 * selected segment is a raised pill inside an inset track. Each segment is a
 * real <button> in a `tablist`, so Tab/Shift-Tab moves between segments and
 * Space/Enter selects — no custom key handling, nothing to trap focus.
 */
export function Segmented({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-border bg-surface-inset p-1 ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-medium transition-all duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${
              active
                ? "bg-background text-heading shadow-xs"
                : "text-muted hover:bg-background/60 hover:text-foreground"
            }`}
          >
            {option.icon && <Icon name={option.icon} size={14} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
