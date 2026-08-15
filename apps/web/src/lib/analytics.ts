const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const ANON_KEY = "aigos_anon";

export function getAnonymousId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
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
  void fetch(`${API_URL}/analytics/events`, {
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
  const res = await fetch(`${API_URL}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { ok: boolean; message: string };
}
