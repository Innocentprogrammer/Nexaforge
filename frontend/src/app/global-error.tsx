"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";

/**
 * Last-resort fallback when the root layout itself fails. It replaces the whole
 * document, so global styles and fonts are unavailable: styles are inline and
 * follow the OS colour scheme.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          colorScheme: "light dark",
          padding: "16px",
        }}
      >
        <title>Something went wrong — NexaForge</title>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 20px", lineHeight: 1.6, opacity: 0.75 }}>
            NexaForge couldn&apos;t load this page. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
