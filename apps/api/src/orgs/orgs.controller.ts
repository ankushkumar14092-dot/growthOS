import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { PilotMetricsService } from "../analytics/pilot-metrics.service";
import { CreateOrganizationDto, InviteMemberDto } from "./dto/orgs.dto";
import { MissionControlService } from "./mission-control.service";
import { OrgsService } from "./orgs.service";

@Controller("organizations")
@UseGuards(JwtAuthGuard)
export class OrgsController {
  constructor(
    private readonly orgs: OrgsService,
    private readonly mission: MissionControlService,
    private readonly pilot: PilotMetricsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.orgs.create(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.orgs.listForUser(user.userId);
  }

  @Get(":id/mission-control")
  missionControl(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.mission.getOverview(user.userId, id);
  }

  @Get(":id/pilot-metrics")
  pilotMetrics(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.pilot.get(user.userId, id);
  }

  @Get(":id/search")
  search(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Query("q") q?: string,
  ) {
    return this.mission.search(user.userId, id, q ?? "");
  }

  @Get(":id/members")
  listMembers(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.orgs.listMembers(user.userId, id);
  }

  @Post(":id/invites")
  invite(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.orgs.invite(user.userId, id, dto);
  }
}
