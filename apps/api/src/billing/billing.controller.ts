import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PlanTier } from "@prisma/client";
import { IsEnum } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { BillingService } from "./billing.service";
import { UsageService } from "./usage.service";

class CheckoutDto {
  @IsEnum(PlanTier)
  plan!: PlanTier;
}

@Controller()
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly usage: UsageService,
  ) {}

  @Get("organizations/:id/billing")
  @UseGuards(JwtAuthGuard)
  summary(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.billing.getSummary(user.userId, id);
  }

  @Get("organizations/:id/usage")
  @UseGuards(JwtAuthGuard)
  async usageSummary(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    await this.billing.getSummary(user.userId, id);
    return this.usage.summary(id, 30);
  }

  @Post("organizations/:id/billing/checkout")
  @UseGuards(JwtAuthGuard)
  checkout(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() dto: CheckoutDto,
  ) {
    return this.billing.createCheckout(user.userId, id, dto.plan);
  }

  @Post("organizations/:id/billing/portal")
  @UseGuards(JwtAuthGuard)
  portal(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.billing.createPortal(user.userId, id);
  }

  @Post("billing/webhook")
  webhook(
    @Req() req: { rawBody?: Buffer; body?: unknown },
    @Headers("x-razorpay-signature") signature: string | undefined,
    @Body() body: unknown,
  ) {
    const payload =
      req.rawBody ??
      Buffer.from(JSON.stringify(body ?? req.body ?? {}), "utf8");
    return this.billing.handleWebhook(payload, signature);
  }
}
