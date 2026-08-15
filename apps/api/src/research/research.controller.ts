import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ResearchService } from "./research.service";

class ResearchBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  query?: string;
}

class ResearchApplyBodyDto {
  @IsOptional()
  @IsBoolean()
  approve?: boolean;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ResearchController {
  constructor(private readonly research: ResearchService) {}

  @Get("research/status")
  status() {
    return this.research.status();
  }

  @Get("sites/:id/research")
  getCached(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.research.getCached(user.userId, id);
  }

  @Post("sites/:id/research")
  run(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: ResearchBodyDto,
  ) {
    return this.research.researchSite(user.userId, id, {
      query: body?.query,
    });
  }

  @Post("sites/:id/research/apply")
  apply(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: ResearchApplyBodyDto,
  ) {
    return this.research.applyResearch(user.userId, id, {
      approve: body?.approve !== false,
    });
  }
}
