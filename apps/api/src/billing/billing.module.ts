import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { UsageService } from "./usage.service";

@Module({
  controllers: [BillingController],
  providers: [BillingService, UsageService],
  exports: [BillingService, UsageService],
})
export class BillingModule {}
