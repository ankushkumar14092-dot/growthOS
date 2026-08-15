import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, SignupDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        profile: { name: dto.name },
      },
    });

    return this.tokenResponse(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.tokenResponse(user.id, user.email);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        memberships: {
          include: { organization: true },
          where: { organization: { deletedAt: null } },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      profile: user.profile,
      memberships: user.memberships.map((m) => ({
        id: m.id,
        role: m.role,
        organization: {
          id: m.organization.id,
          name: m.organization.name,
          plan: m.organization.plan,
        },
      })),
    };
  }

  private tokenResponse(userId: string, email: string) {
    const accessToken = this.jwt.sign({
      sub: userId,
      email,
    });
    return { accessToken, user: { id: userId, email } };
  }
}
