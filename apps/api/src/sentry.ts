/** Optional Sentry — activates only when SENTRY_DSN is set. */
export async function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    // Dynamic import so API boots without the package in minimal installs.
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    });
    // eslint-disable-next-line no-console
    console.log("Sentry initialized for API");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "Sentry DSN set but @sentry/node not installed — run: npm i @sentry/node -w @ai-growth-os/api",
      err instanceof Error ? err.message : err,
    );
  }
}
