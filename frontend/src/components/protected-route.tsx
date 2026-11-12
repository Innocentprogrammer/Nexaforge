"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    // A shaped placeholder rather than a "Loading…" line, so the jump into the
    // dashboard doesn't flash an empty screen.
    return (
      <div
        className="flex min-h-screen flex-1 bg-canvas"
        role="status"
        aria-label="Loading your workspace"
      >
        <div className="hidden w-60 shrink-0 flex-col gap-2 border-r border-border px-4 py-5 sm:flex">
          <Skeleton className="mb-6 h-6 w-32" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 items-center justify-end border-b border-border px-6">
            <Skeleton className="h-7 w-36 rounded-lg" />
          </div>
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="mt-3 h-4 w-80" />
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
