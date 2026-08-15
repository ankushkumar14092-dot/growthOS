import { Injectable } from "@nestjs/common";
import { ConnectionType } from "@ai-growth-os/shared";
import { GithubAdapter } from "./github.adapter";
import { UrlAuditAdapter } from "./url-audit.adapter";
import { WordpressAdapter } from "./wordpress.adapter";
import { ZipAdapter } from "./zip.adapter";
import { ConnectionAdapter, SiteConnectionContext, VerifyResult } from "./types";
import { capabilitiesFor } from "./types";

@Injectable()
export class ConnectionRegistry {
  private readonly byType: Map<ConnectionType, ConnectionAdapter>;

  constructor(
    wordpress: WordpressAdapter,
    github: GithubAdapter,
    zip: ZipAdapter,
    urlAudit: UrlAuditAdapter,
  ) {
    this.byType = new Map<ConnectionType, ConnectionAdapter>();
    this.byType.set("wordpress", wordpress);
    this.byType.set("github", github);
    this.byType.set("zip", zip);
    this.byType.set("url_audit", urlAudit);
  }

  list() {
    return (["wordpress", "github", "zip", "url_audit"] as ConnectionType[]).map(
      (type) => ({
        type,
        ...capabilitiesFor(type),
      }),
    );
  }

  get(type: ConnectionType): ConnectionAdapter {
    const adapter = this.byType.get(type);
    if (!adapter) throw new Error(`unknown_connection_type:${type}`);
    return adapter;
  }

  verify(
    type: ConnectionType,
    ctx: SiteConnectionContext,
  ): Promise<VerifyResult> {
    return this.get(type).verify(ctx);
  }
}
