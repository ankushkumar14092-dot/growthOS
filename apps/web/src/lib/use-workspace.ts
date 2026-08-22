"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiMe, TOKEN_KEY, type MeResponse } from "@/lib/api";

/** Load auth + first org membership; redirect to login/onboarding when needed. */
export function useWorkspace() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }
    apiMe(token)
      .then((data) => {
        if (data.memberships.length === 0) {
          router.replace("/onboarding");
          return;
        }
        setMe(data);
        setReady(true);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        router.replace("/login");
      });
  }, [router]);

  const membership = me?.memberships[0];
  const org = membership?.organization;
  const orgId = org?.id;
  const role = membership?.role;
  const userLabel = me
    ? `${(me.profile as { name?: string })?.name ?? me.email} · ${role} · ${org?.plan}`
    : undefined;

  return { me, org, orgId, role, userLabel, ready };
}
