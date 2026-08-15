import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MembershipRole, PlanTier } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrganizationDto, InviteMemberDto } from "./dto/orgs.dto";

@Injectable()
export class OrgsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const plan = (dto.plan ?? "free") as PlanTier;
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name.trim(),
          plan,
        },
      });
      await tx.membership.create({
        data: {
          userId,
          organizationId: org.id,
          role: MembershipRole.owner,
        },
      });
      return {
        id: org.id,
        name: org.name,
        plan: org.plan,
        role: "owner" as const,
      };
    });
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        organization: { deletedAt: null },
      },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      plan: m.organization.plan,
      role: m.role,
      membershipId: m.id,
    }));
  }

  async invite(actorUserId: string, orgId: string, dto: InviteMemberDto) {
    await this.requireRole(actorUserId, orgId, [MembershipRole.owner]);

    const email = dto.email.toLowerCase();
    const role = (dto.role ?? "member") as MembershipRole;
    if (role === MembershipRole.owner) {
      // Only one owner path for MVP invites — members only unless existing owner promoting later
    }

    let user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      // Placeholder invitee — they set password on first signup with same email is blocked;
      // For MVP: create user without password; they use a reset flow later.
      // Simpler MVP: require invitee to already have an account.
      throw new NotFoundException(
        "Invitee must sign up first, then you can add their email",
      );
    }

    const existing = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: orgId,
        },
      },
    });
    if (existing) {
      return {
        membershipId: existing.id,
        userId: user.id,
        email: user.email,
        role: existing.role,
        status: "already_member" as const,
      };
    }

    const membership = await this.prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role: role === MembershipRole.owner ? MembershipRole.member : role,
      },
    });

    return {
      membershipId: membership.id,
      userId: user.id,
      email: user.email,
      role: membership.role,
      status: "invited" as const,
    };
  }

  async listMembers(actorUserId: string, orgId: string) {
    await this.requireRole(actorUserId, orgId, [
      MembershipRole.owner,
      MembershipRole.member,
    ]);

    const members = await this.prisma.membership.findMany({
      where: { organizationId: orgId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    return members.map((m) => ({
      membershipId: m.id,
      userId: m.userId,
      email: m.user.email,
      role: m.role,
      profile: m.user.profile,
    }));
  }

  private async requireRole(
    userId: string,
    orgId: string,
    roles: MembershipRole[],
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: orgId },
      },
    });
    if (!membership || !roles.includes(membership.role)) {
      throw new ForbiddenException("org_forbidden");
    }
    return membership;
  }
}
