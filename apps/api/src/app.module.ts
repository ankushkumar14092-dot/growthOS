import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { OrgsModule } from "./orgs/orgs.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SitesModule } from "./sites/sites.module";
import { ScansModule } from "./scans/scans.module";
import { ProposalsModule } from "./proposals/proposals.module";
import { DeploymentsModule } from "./deployments/deployments.module";
import { ResearchModule } from "./research/research.module";
import { AnalyticsModule } from "./analytics/analytics.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Root first, then apps/api/.env. With dotenv default (no override),
      // first defined value wins — keep secrets in root; only set api/.env to override.
      envFilePath: ["../../.env", ".env"],
    }),
    PrismaModule,
    AuthModule,
    OrgsModule,
    SitesModule,
    ProposalsModule,
    ScansModule,
    DeploymentsModule,
    AnalyticsModule,
    BillingModule,
    ResearchModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
