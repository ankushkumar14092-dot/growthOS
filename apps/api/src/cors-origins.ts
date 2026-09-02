/** Production web origins — always allowed in addition to CORS_ORIGIN env. */
export const PRODUCTION_WEB_ORIGINS = [
  "https://grothos.in",
  "https://www.grothos.in",
  "https://grothos.vercel.app",
] as const;

export function resolveCorsOrigins(rawOrigin = "http://localhost:3000"): string[] {
  const fromEnv = rawOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === "production") {
    return [...new Set([...fromEnv, ...PRODUCTION_WEB_ORIGINS])];
  }

  return fromEnv;
}

/** Primary public web URL for billing redirects and return links. */
export function primaryWebOrigin(rawOrigin = "http://localhost:3000"): string {
  const origins = resolveCorsOrigins(rawOrigin);
  return (
    origins.find((origin) => origin === "https://grothos.in") ??
    origins.find((origin) => origin.includes("grothos.in")) ??
    origins[0] ??
    "http://localhost:3000"
  );
}
