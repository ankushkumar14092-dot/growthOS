import { Module } from "@nestjs/common";
import { WpClientService } from "../sites/wp-client.service";
import { ConnectionRegistry } from "./connection.registry";
import { GithubAdapter } from "./github.adapter";
import { UrlAuditAdapter } from "./url-audit.adapter";
import { WordpressAdapter } from "./wordpress.adapter";
import { ZipAdapter } from "./zip.adapter";
import { ZipStorageService } from "./zip-storage.service";

@Module({
  providers: [
    WpClientService,
    WordpressAdapter,
    GithubAdapter,
    ZipAdapter,
    UrlAuditAdapter,
    ConnectionRegistry,
    ZipStorageService,
  ],
  exports: [ConnectionRegistry, ZipStorageService, WpClientService],
})
export class ConnectionsModule {}
