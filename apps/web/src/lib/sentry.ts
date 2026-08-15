/**
 * Browser Sentry hook (Phase 8).
 * Never statically/dynamically import `@sentry/browser` here — Next's bundler
 * fails the whole app compile when that resolve breaks (workspace hoist timing).
 * Enable later via CDN/loader when NEXT_PUBLIC_SENTRY_DSN is set in production.
 */
export async function initWebSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || typeof window === "undefined") return;

  // Optional CDN loader — does not go through webpack/turbopack resolve.
  try {
    await loadSentryFromCdn(dsn);
  } catch {
    // Non-fatal: app works without Sentry when CDN/load fails.
  }
}

function loadSentryFromCdn(dsn: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as Window & {
      Sentry?: { init: (o: Record<string, unknown>) => void };
    };
    if (w.Sentry) {
      w.Sentry.init({ dsn, tracesSampleRate: 0.1 });
      resolve();
      return;
    }
    const existing = document.querySelector("script[data-aigos-sentry]");
    if (existing) {
      existing.addEventListener("load", () => {
        w.Sentry?.init({ dsn, tracesSampleRate: 0.1 });
        resolve();
      });
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://browser.sentry-cdn.com/8.55.0/bundle.tracing.min.js";
    script.crossOrigin = "anonymous";
    script.dataset.aigosSentry = "1";
    script.onload = () => {
      try {
        w.Sentry?.init({ dsn, tracesSampleRate: 0.1 });
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error("sentry_cdn_load_failed"));
    document.head.appendChild(script);
  });
}
