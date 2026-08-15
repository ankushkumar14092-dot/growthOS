import { Injectable } from "@nestjs/common";
import { CredentialKind } from "@prisma/client";
import { WpClientService } from "../sites/wp-client.service";
import {
  ConnectionAdapter,
  SiteConnectionContext,
  VerifyResult,
  nowIso,
} from "./types";

@Injectable()
export class WordpressAdapter implements ConnectionAdapter {
  readonly type = "wordpress" as const;

  constructor(private readonly wp: WpClientService) {}

  async verify(ctx: SiteConnectionContext): Promise<VerifyResult> {
    if (!ctx.credential) {
      return {
        ok: false,
        status: "disconnected",
        error: "no_credentials",
        checkedAt: nowIso(),
      };
    }

    const baseUrl =
      (typeof ctx.settings.base_url === "string" && ctx.settings.base_url) ||
      `https://${ctx.domain}`;

    const kind =
      ctx.credential.kind === "app_password"
        ? CredentialKind.app_password
        : CredentialKind.plugin_token;

    const username =
      typeof ctx.credential.meta.username === "string"
        ? ctx.credential.meta.username
        : undefined;

    const result = await this.wp.healthCheck({
      baseUrl,
      kind,
      token: ctx.credential.secret,
      username,
    });

    return {
      ok: result.ok,
      status: result.ok ? "healthy" : "unhealthy",
      statusCode: result.statusCode,
      details: { plugin: result.body },
      error: result.error,
      checkedAt: nowIso(),
    };
  }
}
