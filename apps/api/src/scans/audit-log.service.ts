import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: {
    organizationId: string;
    actorUserId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    meta?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        meta: (input.meta ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
