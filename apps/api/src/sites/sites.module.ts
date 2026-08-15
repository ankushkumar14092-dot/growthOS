import { Module } from "@nestjs/common";
import { ConnectionsModule } from "../connections/connections.module";
import { ScansModule } from "../scans/scans.module";
import { AuditLogService } from "../scans/audit-log.service";
import { SitesController } from "./sites.controller";
import { SitesService } from "./sites.service";

@Module({
  imports: [ConnectionsModule, ScansModule],
  controllers: [SitesController],
  providers: [SitesService, AuditLogService],
  exports: [SitesService],
})
export class SitesModule {}
