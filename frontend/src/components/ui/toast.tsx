"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "@/components/ui/icon";

type ToastTone = "info" | "success" | "warning" | "error";

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** ms before auto-dismiss; 0 keeps it until closed. */
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastInput, "description">> {
  id: number;
  description?: string;
}

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const TONES: Record<ToastTone, { icon: IconName; iconClass: string }> = {
  info: { icon: "info", iconClass: "bg-info/12 text-info" },
  success: { icon: "check-circle", iconClass: "bg-success/12 text-success" },
  warning: { icon: "warning", iconClass: "bg-warning/12 text-warning" },
  error: { icon: "x-circle", iconClass: "bg-error/12 text-error" },
};

/**
 * Transient confirmations, floating over the app. Deliberately used only for
 * messages that are safe to miss — anything a user must be able to re-read
 * (validation, import summaries, plan notices) stays inline as an `Alert`.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    setToasts((prev) => [
      ...prev.slice(-2),
      {
        id,
        title: input.title,
        description: input.description,
        tone: input.tone ?? "success",
        duration: input.duration ?? 4500,
      },
    ]);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 sm:bottom-6 sm:right-6"
      >
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const tone = TONES[toast.tone];

  useEffect(() => {
    if (!toast.duration) return;
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, toast.id, onDismiss]);

  return (
    <div
      className="animate-slide-in-right glass-strong pointer-events-auto overflow-hidden rounded-xl border border-border shadow-xl"
      role={toast.tone === "error" ? "alert" : "status"}
    >
      <div className="flex items-start gap-3 p-3.5">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone.iconClass}`}>
          <Icon name={tone.icon} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-heading">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 text-xs leading-5 text-muted">{toast.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-foreground"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
      {toast.duration > 0 && (
        <div className="h-0.5 bg-border/60">
          <div
            className="h-full origin-left bg-secondary/70"
            style={{
              animation: `toast-countdown ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * `const toast = useToast()` — safe to call outside a provider (returns a
 * no-op), so components stay usable in isolation.
 */
export function useToast() {
  const push = useContext(ToastContext);
  return useMemo(() => push ?? (() => {}), [push]);
}
