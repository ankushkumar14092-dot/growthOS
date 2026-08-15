import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { ProposalsModule } from "../proposals/proposals.module";
import { SitesModule } from "../sites/sites.module";
import { ResearchController } from "./research.controller";
import { ResearchService } from "./research.service";

@Module({
  imports: [SitesModule, BillingModule, ProposalsModule],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}
