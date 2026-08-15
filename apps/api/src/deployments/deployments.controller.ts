import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsArray, IsOptional, IsUUID } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { DeploymentsService } from "./deployments.service";

class DeployBodyDto {
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  patchIds?: string[];
}

@Controller()
@UseGuards(JwtAuthGuard)
export class DeploymentsController {
  constructor(private readonly deployments: DeploymentsService) {}

  @Post("sites/:id/deploy")
  deploy(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: DeployBodyDto,
  ) {
    return this.deployments.deploySite(user.userId, id, body ?? {});
  }

  @Get("sites/:id/deployments")
  list(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.deployments.list(user.userId, id);
  }

  @Get("deployments/:id")
  get(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.deployments.get(user.userId, id);
  }

  @Post("deployments/:id/rollback")
  rollback(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.deployments.rollback(user.userId, id);
  }
}
