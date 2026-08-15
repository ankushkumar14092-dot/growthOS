/** Ensure crawl/verify origins are absolute http(s) URLs. */
export function ensureAbsoluteHttpUrl(
  input: string | null | undefined,
  fallbackDomain?: string,
): string {
  let raw = (input ?? "").trim();
  if (!raw && fallbackDomain) raw = fallbackDomain.trim();
  raw = raw.replace(/\/$/, "");
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw.replace(/^\/+/, "")}`;
  }
  return raw.replace(/\/$/, "");
}
