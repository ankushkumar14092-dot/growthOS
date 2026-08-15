import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ProposalsService } from "./proposals.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class ProposalsController {
  constructor(private readonly proposals: ProposalsService) {}

  @Get("sites/:id/proposals")
  list(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Query("jobRunId") jobRunId?: string,
  ) {
    return this.proposals.list(user.userId, id, jobRunId);
  }

  @Post("sites/:id/proposals/generate")
  generate(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Query("jobRunId") jobRunId?: string,
  ) {
    return this.proposals.generate(user.userId, id, jobRunId);
  }

  @Post("proposals/:id/approve")
  approve(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.proposals.approve(user.userId, id);
  }

  @Post("proposals/:id/reject")
  reject(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.proposals.reject(user.userId, id);
  }
}
