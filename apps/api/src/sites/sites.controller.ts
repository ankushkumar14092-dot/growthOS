import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import {
  ConnectSiteDto,
  CreateSiteDto,
  PatchSiteSettingsDto,
} from "./dto/sites.dto";
import { SitesService } from "./sites.service";

@Controller("sites")
@UseGuards(JwtAuthGuard)
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get("connection-types")
  connectionTypes() {
    return this.sites.listConnectionTypes();
  }

  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateSiteDto,
  ) {
    return this.sites.create(user.userId, dto);
  }

  @Get()
  list(
    @CurrentUser() user: { userId: string },
    @Query("organizationId") organizationId: string,
  ) {
    return this.sites.list(user.userId, organizationId);
  }

  @Get(":id")
  get(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.sites.get(user.userId, id);
  }

  @Delete(":id")
  remove(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.sites.remove(user.userId, id);
  }

  @Post(":id/connect")
  connect(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() dto: ConnectSiteDto,
  ) {
    return this.sites.connect(user.userId, id, dto);
  }

  @Post(":id/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @UploadedFile()
    file: { originalname: string; buffer: Buffer; size: number },
  ) {
    return this.sites.uploadZip(user.userId, id, file);
  }

  @Get(":id/health")
  health(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.sites.health(user.userId, id);
  }

  @Patch(":id/settings")
  patchSettings(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() dto: PatchSiteSettingsDto,
  ) {
    return this.sites.patchSettings(user.userId, id, dto);
  }
}
