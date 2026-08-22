import { getApiUrl } from "./api-url";

const ANON_KEY = "aigos_anon";

/** Works on HTTP LAN IPs where crypto.randomUUID is missing (non-secure context). */
function createId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getAnonymousId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = createId();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

/** Fire-and-forget founder funnel event */
export function trackEvent(
  event: string,
  props?: Record<string, unknown>,
  opts?: { organizationId?: string; userId?: string },
) {
  if (typeof window === "undefined") return;
  const body = {
    event,
    anonymousId: getAnonymousId(),
    organizationId: opts?.organizationId,
    userId: opts?.userId,
    props: props ?? {},
  };
  void fetch(`${getApiUrl()}/analytics/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

export async function joinWaitlist(input: {
  email: string;
  name?: string;
  company?: string;
  role?: string;
}) {
  const res = await fetch(`${getApiUrl()}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { ok: boolean; message: string };
}
