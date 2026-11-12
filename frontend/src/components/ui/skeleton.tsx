/** Shimmering placeholders — shown instead of a blank screen or a "Loading…". */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? "w-1/2" : i % 2 ? "w-5/6" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/** Card-shaped placeholder used by the invitation, template and product grids. */
export function SkeletonCard({ media = false }: { media?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-6 shadow-sm" aria-hidden>
      {media && <Skeleton className="mb-4 h-48 w-full rounded-lg" />}
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-3 w-2/3" />
      <Skeleton className="mt-2 h-3 w-1/3" />
      <Skeleton className="mt-6 h-9 w-full rounded-lg" />
    </div>
  );
}

export function SkeletonGrid({
  count = 6,
  media = false,
  className = "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3",
}: {
  count?: number;
  media?: boolean;
  className?: string;
}) {
  return (
    <div className={className} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} media={media} />
      ))}
    </div>
  );
}

/** Row placeholders for the guest / delivery tables. */
export function SkeletonRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-3 ${c === 0 ? "w-32" : "w-20"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
