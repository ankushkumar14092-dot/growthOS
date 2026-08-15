import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ScansService } from "./scans.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class ScansController {
  constructor(private readonly scans: ScansService) {}

  @Post("sites/:id/audits")
  startAudit(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.scans.startAudit(user.userId, id);
  }

  @Get("job-runs/:id")
  getJob(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.scans.getJobRun(user.userId, id);
  }

  @Get("sites/:id/job-runs")
  listJobs(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.scans.listJobRuns(user.userId, id);
  }

  @Get("sites/:id/issues")
  listIssues(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Query("jobRunId") jobRunId?: string,
  ) {
    return this.scans.listIssues(user.userId, id, jobRunId);
  }

  @Get("sites/:id/pages")
  listPages(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Query("jobRunId") jobRunId?: string,
  ) {
    return this.scans.listPages(user.userId, id, jobRunId);
  }
}
