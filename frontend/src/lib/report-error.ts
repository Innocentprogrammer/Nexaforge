/**
 * Single hook for client-side error reporting. Today it logs to the browser
 * console; to wire up a monitoring service (e.g. Sentry), forward the error from
 * here so every error boundary reports it the same way.
 *
 * Only the error's type, message and digest are logged: never tokens, form
 * contents or other user data.
 */
export function reportClientError(error: unknown): void {
  if (error instanceof Error) {
    const digest = "digest" in error ? (error as Error & { digest?: string }).digest : undefined;
    console.error("[NexaForge] Unhandled UI error", {
      name: error.name,
      message: error.message,
      digest,
    });
    return;
  }
  console.error("[NexaForge] Unhandled UI error (non-Error value thrown)");
}
