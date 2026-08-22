/** Browser API base URL — follows LAN hostname so IP changes don't break fetch. */
export function getApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  if (typeof window === "undefined") return configured;

  const host = window.location.hostname;

  // Always hit local API when the UI is on localhost (ignore stale LAN IPs in .env).
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:4000";
  }

  if (host.endsWith(".vercel.app") || host.endsWith(".onrender.com")) {
    return configured;
  }

  // Same host as the web UI, API on :4000 (local / LAN IP access).
  return `${window.location.protocol}//${host}:4000`;
}
