import { Module } from "@nestjs/common";
import { ConnectionsModule } from "../connections/connections.module";
import { ArtifactDeployService } from "./artifact-deploy.service";
import { DeployPipelineService } from "./deploy-pipeline.service";
import { DeployQueueService } from "./deploy-queue.service";
import { DeploymentsController } from "./deployments.controller";
import { DeploymentsService } from "./deployments.service";
import { GithubPrDeployService } from "./github-pr-deploy.service";

@Module({
  imports: [ConnectionsModule],
  controllers: [DeploymentsController],
  providers: [
    DeploymentsService,
    DeployPipelineService,
    DeployQueueService,
    GithubPrDeployService,
    ArtifactDeployService,
  ],
  exports: [DeploymentsService, DeployQueueService],
})
export class DeploymentsModule {}
