import { Body, Controller, Post } from "@nestjs/common";
import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";
import { AnalyticsService } from "./analytics.service";

class TrackEventDto {
  @IsString()
  @MaxLength(80)
  event!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  anonymousId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;
}

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post("events")
  track(@Body() dto: TrackEventDto) {
    return this.analytics.track(dto);
  }
}
