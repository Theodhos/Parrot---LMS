"use client";

import { useEffect } from "react";

/**
 * Only fires when the ROOT layout itself throws (fonts, providers, etc.) --
 * everything else is caught by error.tsx. Must render its own <html>/<body>
 * since it replaces the root layout entirely, and must stay dependency-free
 * (no Tailwind classes, no custom components) since whatever broke the
 * layout could have broken those too.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          fontFamily: "system-ui, sans-serif",
          background: "#FDFCF8",
          color: "#1F2937",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6B7280", marginBottom: "1.5rem" }}>
            The application failed to load. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "9999px",
              border: "none",
              background: "#FF6B6B",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
