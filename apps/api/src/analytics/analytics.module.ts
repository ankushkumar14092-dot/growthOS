import { Module } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { PilotMetricsService } from "./pilot-metrics.service";
import { WaitlistController } from "./waitlist.controller";

@Module({
  controllers: [AnalyticsController, WaitlistController],
  providers: [AnalyticsService, PilotMetricsService],
  exports: [AnalyticsService, PilotMetricsService],
})
export class AnalyticsModule {}
