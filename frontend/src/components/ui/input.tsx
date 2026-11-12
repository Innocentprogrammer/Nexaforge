import {
  InputHTMLAttributes,
  forwardRef,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Icon } from "@/components/ui/icon";

/**
 * Form controls, macOS-style: a hairline at rest, a firmer line on hover, and
 * on focus a 3px tinted halo that grows out of the border rather than shifting
 * the layout. Every control shares the 36px height used by Button.
 */
const base =
  "w-full rounded-lg border bg-background px-3 text-sm text-foreground shadow-2xs outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted/70 hover:border-border-strong focus:border-secondary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--secondary)_18%,transparent)] disabled:cursor-not-allowed disabled:bg-background-subtle disabled:text-muted";

/** Validation styling is opt-in per field via `data-state`. */
const stateClasses =
  "data-[state=error]:border-error data-[state=error]:focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--error)_18%,transparent)] data-[state=success]:border-success data-[state=success]:focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_18%,transparent)]";

export const Label = ({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={`mb-1.5 block text-[0.8125rem] font-medium leading-5 text-foreground ${className}`}
    {...props}
  />
);

/** Small helper line under a field. */
export const Hint = ({ className = "", ...props }: LabelHTMLAttributes<HTMLParagraphElement>) => (
  <p className={`mt-1.5 text-xs text-muted ${className}`} {...props} />
);

/** Inline validation message, paired with `data-state="error"` on the control. */
export const FieldError = ({
  className = "",
  children,
  ...props
}: LabelHTMLAttributes<HTMLParagraphElement>) => (
  <p
    role="alert"
    className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium text-error ${className}`}
    {...props}
  >
    <Icon name="warning" size={13} />
    {children}
  </p>
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input ref={ref} className={`${base} ${stateClasses} h-9 ${className}`} {...props} />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`${base} ${stateClasses} min-h-[5.5rem] resize-y py-2 leading-6 ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

/**
 * Native `<select>` — keeps the platform's own keyboard behaviour and mobile
 * picker, wrapped so the chevron and metrics match the rest of the system.
 */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={`${base} ${stateClasses} h-9 cursor-pointer appearance-none pr-9 ${className}`}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  )
);
Select.displayName = "Select";

/** File picker styled to match the control set (used by the CSV import). */
export const FileInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      type="file"
      className={`block w-full cursor-pointer rounded-lg border border-border bg-background py-[7px] pl-1.5 pr-3 text-sm text-muted shadow-2xs transition-[border-color,box-shadow] duration-150 hover:border-border-strong focus:border-secondary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--secondary)_18%,transparent)] focus:outline-none file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-border ${className}`}
      {...props}
    />
  )
);
FileInput.displayName = "FileInput";
