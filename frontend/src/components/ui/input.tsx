import { InputHTMLAttributes, forwardRef, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";

export const Label = (props: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className="mb-1.5 block text-sm font-medium text-foreground" {...props} />
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
