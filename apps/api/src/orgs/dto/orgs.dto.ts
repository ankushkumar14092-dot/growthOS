import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateOrganizationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsEnum(["free", "starter", "agency"] as const)
  plan?: "free" | "starter" | "agency";
}

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(["owner", "member"] as const)
  role?: "owner" | "member";
}
