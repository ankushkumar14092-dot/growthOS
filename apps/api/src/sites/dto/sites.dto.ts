import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateSiteDto {
  @IsUUID()
  organizationId!: string;

  @IsIn(["wordpress", "github", "zip", "url_audit"])
  connectionType!: "wordpress" | "github" | "zip" | "url_audit";

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  domain!: string;

  /** Origin for WP / URL audit, e.g. https://example.com */
  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  /** owner/repo or https://github.com/owner/repo */
  @ValidateIf((o: CreateSiteDto) => o.connectionType === "github")
  @IsOptional()
  @IsString()
  @MaxLength(255)
  repo?: string;
}

export class ConnectSiteDto {
  @IsIn([
    "plugin_token",
    "app_password",
    "github_token",
    "url_audit",
    "zip",
  ])
  kind!:
    | "plugin_token"
    | "app_password"
    | "github_token"
    | "url_audit"
    | "zip";

  @ValidateIf(
    (o: ConnectSiteDto) =>
      o.kind === "plugin_token" ||
      o.kind === "app_password" ||
      o.kind === "github_token",
  )
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  token?: string;

  @ValidateIf((o: ConnectSiteDto) => o.kind === "app_password")
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  username?: string;

  @ValidateIf((o: ConnectSiteDto) => o.kind === "github_token")
  @IsOptional()
  @IsString()
  @MaxLength(255)
  repo?: string;

  @ValidateIf((o: ConnectSiteDto) => o.kind === "github_token")
  @IsOptional()
  @IsString()
  @MaxLength(120)
  defaultBranch?: string;
}

export class PatchSiteSettingsDto {
  @IsOptional()
  @IsBoolean()
  safe_auto_apply?: boolean;

  @IsOptional()
  @IsIn(["weekly", "manual"])
  schedule?: "weekly" | "manual";

  @IsOptional()
  @IsUrl({ require_tld: false })
  base_url?: string;
}
