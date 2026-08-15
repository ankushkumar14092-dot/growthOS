import { ConnectionType, getConnectionCapabilities } from "@ai-growth-os/shared";

export type VerifyResult = {
  ok: boolean;
  status: "healthy" | "unhealthy" | "disconnected";
  statusCode?: number;
  details?: Record<string, unknown>;
  error?: string;
  checkedAt: string;
};

export type SiteConnectionContext = {
  siteId: string;
  domain: string;
  connectionType: ConnectionType;
  settings: Record<string, unknown>;
  credential?: {
    kind: string;
    secret: string;
    meta: Record<string, unknown>;
  } | null;
};

export interface ConnectionAdapter {
  readonly type: ConnectionType;
  verify(ctx: SiteConnectionContext): Promise<VerifyResult>;
}

export function capabilitiesFor(type: ConnectionType) {
  return getConnectionCapabilities(type);
}

export function nowIso() {
  return new Date().toISOString();
}
