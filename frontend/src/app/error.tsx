"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { reportClientError } from "@/lib/report-error";

/**
 * Fallback for an unexpected error anywhere below the root layout. Shows a
 * calm message instead of a blank page; the technical detail goes to the
 * console (and an error-reporting service, once one is configured), never on
 * screen. In production Next.js replaces server error messages with a digest.
 */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <EmptyState
        icon="warning"
        title="Something went wrong"
        description={
          <>
            This page hit an unexpected problem. Your saved work is safe — please try again.
            {digest && <span className="mt-2 block text-xs text-muted">Reference: {digest}</span>}
          </>
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => retry()}>Try again</Button>
            <Link href="/">
              <Button variant="outline">Go to home</Button>
            </Link>
          </div>
        }
      />
    </main>
  );
}
