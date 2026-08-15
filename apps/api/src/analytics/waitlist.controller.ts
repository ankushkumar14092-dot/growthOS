import { Body, Controller, Post } from "@nestjs/common";
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";
import * as fs from "node:fs";
import * as path from "node:path";
import { AnalyticsService } from "./analytics.service";

class WaitlistDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  role?: string;
}

@Controller("waitlist")
export class WaitlistController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post()
  async join(@Body() dto: WaitlistDto) {
    const row = {
      at: new Date().toISOString(),
      email: dto.email.toLowerCase().trim(),
      name: dto.name?.trim() ?? null,
      company: dto.company?.trim() ?? null,
      role: dto.role?.trim() ?? null,
    };
    const dir = path.join(process.cwd(), "storage", "waitlist");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(
      path.join(dir, "signups.jsonl"),
      `${JSON.stringify(row)}\n`,
      "utf8",
    );
    await this.analytics.track({
      event: "waitlist_joined",
      props: { email: row.email, role: row.role },
    });
    return { ok: true, message: "You're on the private beta list." };
  }
}
