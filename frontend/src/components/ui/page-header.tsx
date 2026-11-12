import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * The top of every in-app screen: breadcrumbs for depth, one H1, one
 * supporting line, and the screen's actions right-aligned (wrapping under the
 * title on narrow viewports rather than shrinking).
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  meta,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  /** Badges or status text shown beside the title. */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
            {breadcrumbs.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <Icon name="chevron-right" size={13} className="opacity-60" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="rounded px-1 py-0.5 transition-colors duration-150 hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="px-1 py-0.5 font-medium text-foreground/80" aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-heading text-[1.375rem] font-semibold tracking-tight text-heading sm:text-2xl">
              {title}
            </h1>
            {meta}
          </div>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
