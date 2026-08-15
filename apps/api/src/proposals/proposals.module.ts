import { Module, forwardRef } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { DeploymentsModule } from "../deployments/deployments.module";
import { AutoApplyService } from "./auto-apply.service";
import { ProposalPipelineService } from "./proposal-pipeline.service";
import { ProposeQueueService } from "./propose-queue.service";
import { ProposalsController } from "./proposals.controller";
import { ProposalsService } from "./proposals.service";

@Module({
  imports: [forwardRef(() => DeploymentsModule), BillingModule],
  controllers: [ProposalsController],
  providers: [
    ProposalsService,
    ProposalPipelineService,
    ProposeQueueService,
    AutoApplyService,
  ],
  exports: [
    ProposeQueueService,
    ProposalPipelineService,
    AutoApplyService,
    ProposalsService,
  ],
})
export class ProposalsModule {}
