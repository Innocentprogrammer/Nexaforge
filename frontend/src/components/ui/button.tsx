import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "inverse";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

/**
 * One button, one hierarchy. Heights are fixed per size so a row of mixed
 * variants always lines up (36px is the default control height across the app,
 * matching Input/Select).
 *
 * primary   — the one action a screen wants you to take
 * secondary — solid navy, for brand-surface actions
 * outline   — the default "another option" control
 * ghost     — low-emphasis, inline with text or icons
 * danger    — destructive; deep red rather than a bright alarm red
 * inverse   — outline on a dark/photographic panel
 */
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary-hover hover:shadow-sm",
  secondary: "bg-primary text-primary-foreground shadow-xs hover:brightness-125",
  outline:
    "border border-border bg-background text-foreground shadow-2xs hover:border-border-strong hover:bg-background-subtle",
  ghost: "bg-transparent text-foreground hover:bg-surface-2",
  danger: "bg-error text-white shadow-xs hover:brightness-110",
  inverse:
    "border border-white/35 bg-white/10 text-white backdrop-blur-sm hover:border-white/60 hover:bg-white/20",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-9 gap-2 rounded-lg px-4 text-sm",
  lg: "h-11 gap-2 rounded-xl px-6 text-base",
  icon: "h-9 w-9 rounded-lg",
  "icon-sm": "h-8 w-8 rounded-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner in place of the leading content; also disables the button. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading = false, className = "", children, disabled, ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`group relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[transform,background-color,border-color,box-shadow,opacity] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading && <span className="spinner" aria-hidden />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

/**
 * A square, label-less action. `tip` renders the accessible name *and* the
 * hover/focus tooltip, so icon-only controls are never unlabelled.
 */
interface IconButtonProps extends Omit<ButtonProps, "size"> {
  tip: string;
  size?: "sm" | "md";
  /** Place the tooltip below instead of to the right. */
  tipBelow?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ tip, tipBelow = false, size = "md", className = "", ...props }, ref) => (
    <Button
      ref={ref}
      variant={props.variant ?? "ghost"}
      size={size === "sm" ? "icon-sm" : "icon"}
      aria-label={tip}
      data-tip={tip}
      className={`tt ${tipBelow ? "tt-below" : ""} ${className}`}
      {...props}
    />
  )
);
IconButton.displayName = "IconButton";
