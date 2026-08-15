import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { MissionControlService } from "./mission-control.service";
import { OrgsController } from "./orgs.controller";
import { OrgsService } from "./orgs.service";

@Module({
  imports: [AnalyticsModule],
  controllers: [OrgsController],
  providers: [OrgsService, MissionControlService],
  exports: [OrgsService, MissionControlService],
})
export class OrgsModule {}
