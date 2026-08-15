import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { ProposalsModule } from "../proposals/proposals.module";
import { ContentResolver } from "./content-resolver";
import { AuditLogService } from "./audit-log.service";
import { ScanPipelineService } from "./scan-pipeline.service";
import { ScanQueueService } from "./scan-queue.service";
import { ScheduleQueueService } from "./schedule-queue.service";
import { ScansController } from "./scans.controller";
import { ScansService } from "./scans.service";

@Module({
  imports: [ProposalsModule, BillingModule],
  controllers: [ScansController],
  providers: [
    ScansService,
    ScanQueueService,
    ScheduleQueueService,
    ScanPipelineService,
    ContentResolver,
    AuditLogService,
  ],
  exports: [AuditLogService, ScansService, ScheduleQueueService],
})
export class ScansModule {}
