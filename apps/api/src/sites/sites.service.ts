import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ConnectionType,
  getConnectionCapabilities,
} from "@ai-growth-os/shared";
import {
  ConnectionType as PrismaConnectionType,
  CredentialKind,
  MembershipRole,
  Prisma,
} from "@prisma/client";
import { ConnectionRegistry } from "../connections/connection.registry";
import { parseRepo } from "../connections/github.adapter";
import { ensureAbsoluteHttpUrl } from "../connections/normalize-origin";
import { ZipStorageService } from "../connections/zip-storage.service";
import { decryptSecret, encryptSecret } from "../crypto/secrets";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../scans/audit-log.service";
import { ScheduleQueueService } from "../scans/schedule-queue.service";
import {
  ConnectSiteDto,
  CreateSiteDto,
  PatchSiteSettingsDto,
} from "./dto/sites.dto";

type SiteSettings = Record<string, unknown>;

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connections: ConnectionRegistry,
    private readonly zipStorage: ZipStorageService,
    private readonly audit: AuditLogService,
    private readonly scheduleQueue: ScheduleQueueService,
  ) {}

  listConnectionTypes() {
    return this.connections.list();
  }

  async create(userId: string, dto: CreateSiteDto) {
    await this.requireMembership(userId, dto.organizationId);

    const connectionType = dto.connectionType as ConnectionType;
    let domain = dto.domain.trim();
    const settings: SiteSettings = {
      safe_auto_apply: false,
      schedule: "weekly",
    };

    if (connectionType === "github") {
      const repoInput = dto.repo?.trim() || dto.domain.trim();
      const parsed = parseRepo(repoInput);
      if (!parsed) throw new BadRequestException("invalid_github_repo");
      domain = `${parsed.owner}/${parsed.repo}`.toLowerCase();
      settings.repo = `${parsed.owner}/${parsed.repo}`;
    } else if (connectionType === "url_audit") {
      const base = ensureAbsoluteHttpUrl(
        dto.baseUrl || dto.domain,
        normalizeDomain(dto.domain),
      );
      if (!base) throw new BadRequestException("base_url_required");
      settings.base_url = base;
      domain = normalizeDomain(base);
    } else if (connectionType === "zip") {
      domain = normalizeDomain(dto.domain) || `zip-${Date.now()}`;
    } else {
      domain = normalizeDomain(dto.domain);
      if (dto.baseUrl) {
        settings.base_url = ensureAbsoluteHttpUrl(dto.baseUrl, domain);
      }
    }

    const existing = await this.prisma.site.findFirst({
      where: {
        organizationId: dto.organizationId,
        domain,
        deletedAt: null,
      },
    });
    if (existing) throw new ConflictException("site_domain_exists");

    const cms =
      connectionType === "wordpress"
        ? "wordpress"
        : connectionType === "github"
          ? "github"
          : connectionType === "zip"
            ? "zip"
            : "url_audit";

    const site = await this.prisma.site.create({
      data: {
        organizationId: dto.organizationId,
        domain,
        connectionType: connectionType as PrismaConnectionType,
        cms,
        settings: settings as Prisma.InputJsonValue,
        healthStatus: "disconnected",
      },
    });

    await this.scheduleQueue.syncSiteSchedule(
      site.id,
      String(settings.schedule ?? "weekly"),
    );

    return this.toPublic(site);
  }

  async list(userId: string, organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("organizationId_required");
    }
    await this.requireMembership(userId, organizationId);
    const sites = await this.prisma.site.findMany({
      where: { organizationId, deletedAt: null },
      include: { credential: { select: { kind: true, updatedAt: true } } },
      orderBy: { createdAt: "desc" },
    });
    return sites.map((s) => this.toPublic(s));
  }

  async get(userId: string, siteId: string) {
    const site = await this.getSiteForUser(userId, siteId);
    return this.toPublic(site);
  }

  async remove(userId: string, siteId: string) {
    const site = await this.getSiteForUser(userId, siteId);
    await this.scheduleQueue.syncSiteSchedule(site.id, "manual");
    await this.prisma.site.update({
      where: { id: site.id },
      data: { deletedAt: new Date() },
    });
    await this.audit.write({
      organizationId: site.organizationId,
      actorUserId: userId,
      action: "site.removed",
      resourceType: "site",
      resourceId: site.id,
      meta: {
        domain: site.domain,
        connectionType: site.connectionType,
      },
    });
    return { ok: true, id: site.id };
  }

  async connect(userId: string, siteId: string, dto: ConnectSiteDto) {
    const site = await this.getSiteForUser(userId, siteId);
    const type = site.connectionType as ConnectionType;

    if (type === "wordpress") {
      if (dto.kind !== "plugin_token" && dto.kind !== "app_password") {
        throw new BadRequestException("invalid_credential_kind_for_wordpress");
      }
      if (!dto.token?.trim()) throw new BadRequestException("token_required");
      if (dto.kind === "app_password" && !dto.username?.trim()) {
        throw new BadRequestException("username_required_for_app_password");
      }
      const meta: Record<string, string> = {};
      if (dto.username) meta.username = dto.username.trim();
      await this.upsertCredential(
        site.id,
        dto.kind as CredentialKind,
        dto.token.trim(),
        meta,
      );
    } else if (type === "github") {
      if (dto.kind !== "github_token" || !dto.token?.trim()) {
        throw new BadRequestException("github_token_required");
      }
      const settings = { ...(site.settings as SiteSettings) };
      if (dto.repo) {
        const parsed = parseRepo(dto.repo);
        if (!parsed) throw new BadRequestException("invalid_github_repo");
        settings.repo = `${parsed.owner}/${parsed.repo}`;
      }
      if (dto.defaultBranch) settings.default_branch = dto.defaultBranch;
      await this.prisma.site.update({
        where: { id: site.id },
        data: { settings: settings as Prisma.InputJsonValue },
      });
      await this.upsertCredential(
        site.id,
        CredentialKind.github_token,
        dto.token.trim(),
        { repo: String(settings.repo ?? site.domain) },
      );
    } else if (type === "url_audit") {
      // No secrets — verify URL reachability
    } else if (type === "zip") {
      throw new BadRequestException("use_upload_endpoint_for_zip");
    } else {
      throw new BadRequestException("unsupported_connection_type");
    }

    const health = await this.runVerify(site.id);
    await this.audit.write({
      organizationId: site.organizationId,
      actorUserId: userId,
      action: "site.connected",
      resourceType: "site",
      resourceId: site.id,
      meta: { connectionType: type, health: health.status },
    });
    return {
      site: await this.get(userId, siteId),
      health,
      capabilities: getConnectionCapabilities(type),
    };
  }

  async uploadZip(
    userId: string,
    siteId: string,
    file?: { originalname: string; buffer: Buffer; size: number },
  ) {
    const site = await this.getSiteForUser(userId, siteId);
    if (site.connectionType !== "zip") {
      throw new BadRequestException("site_not_zip_type");
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException("zip_file_required");
    }
    if (!file.originalname.toLowerCase().endsWith(".zip")) {
      throw new BadRequestException("file_must_be_zip");
    }
    if (file.size > 50 * 1024 * 1024) {
      throw new BadRequestException("zip_too_large_max_50mb");
    }

    const stored = this.zipStorage.store(file);
    const settings: SiteSettings = {
      ...(site.settings as SiteSettings),
      storage_key: stored.storageKey,
      filename: stored.filename,
      size: stored.size,
      framework: stored.framework,
      root_entries: stored.rootEntries,
    };

    await this.prisma.site.update({
      where: { id: site.id },
      data: {
        settings: settings as Prisma.InputJsonValue,
        cms: stored.framework === "unknown" ? "zip" : stored.framework,
      },
    });

    await this.upsertCredential(site.id, CredentialKind.zip_storage, stored.storageKey, {
      storage_key: stored.storageKey,
      filename: stored.filename,
    });

    const health = await this.runVerify(site.id);
    await this.audit.write({
      organizationId: site.organizationId,
      actorUserId: userId,
      action: "site.zip_uploaded",
      resourceType: "site",
      resourceId: site.id,
      meta: {
        framework: stored.framework,
        filename: stored.filename,
        health: health.status,
      },
    });
    return {
      site: await this.get(userId, siteId),
      health,
      detected: {
        framework: stored.framework,
        filename: stored.filename,
        size: stored.size,
      },
      capabilities: getConnectionCapabilities("zip"),
    };
  }

  async health(userId: string, siteId: string) {
    await this.getSiteForUser(userId, siteId);
    return this.runVerify(siteId);
  }

  async patchSettings(
    userId: string,
    siteId: string,
    dto: PatchSiteSettingsDto,
  ) {
    const site = await this.getSiteForUser(userId, siteId);
    const current = (site.settings ?? {}) as SiteSettings;
    const next: SiteSettings = {
      ...current,
      ...(dto.safe_auto_apply !== undefined
        ? { safe_auto_apply: dto.safe_auto_apply }
        : {}),
      ...(dto.schedule !== undefined ? { schedule: dto.schedule } : {}),
      ...(dto.base_url !== undefined
        ? {
            base_url: ensureAbsoluteHttpUrl(
              dto.base_url,
              site.domain,
            ),
          }
        : {}),
    };

    const updated = await this.prisma.site.update({
      where: { id: site.id },
      data: { settings: next as Prisma.InputJsonValue },
      include: { credential: { select: { kind: true, updatedAt: true } } },
    });

    if (dto.schedule !== undefined) {
      await this.scheduleQueue.syncSiteSchedule(site.id, dto.schedule);
    }

    return this.toPublic(updated);
  }

  private async upsertCredential(
    siteId: string,
    kind: CredentialKind,
    secret: string,
    meta: Record<string, unknown>,
  ) {
    const ciphertext = new Uint8Array(encryptSecret(secret));
    await this.prisma.credential.upsert({
      where: { siteId },
      create: {
        siteId,
        kind,
        secretCiphertext: ciphertext,
        meta: meta as Prisma.InputJsonValue,
      },
      update: {
        kind,
        secretCiphertext: ciphertext,
        meta: meta as Prisma.InputJsonValue,
      },
    });
  }

  private async runVerify(siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, deletedAt: null },
      include: { credential: true },
    });
    if (!site) throw new NotFoundException("site_not_found");

    const type = site.connectionType as ConnectionType;
    let secret = "";
    if (site.credential) {
      secret = decryptSecret(Buffer.from(site.credential.secretCiphertext));
    }

    const result = await this.connections.verify(type, {
      siteId: site.id,
      domain: site.domain,
      connectionType: type,
      settings: (site.settings ?? {}) as Record<string, unknown>,
      credential: site.credential
        ? {
            kind: site.credential.kind,
            secret,
            meta: (site.credential.meta ?? {}) as Record<string, unknown>,
          }
        : type === "url_audit"
          ? null
          : null,
    });

    const settings = { ...(site.settings as SiteSettings) };
    if (type === "url_audit" || type === "wordpress") {
      const normalized = ensureAbsoluteHttpUrl(
        typeof settings.base_url === "string" ? settings.base_url : null,
        site.domain,
      );
      if (normalized) settings.base_url = normalized;
    }

    await this.prisma.site.update({
      where: { id: siteId },
      data: {
        healthStatus: result.status,
        settings: settings as Prisma.InputJsonValue,
      },
    });

    return {
      ...result,
      capabilities: getConnectionCapabilities(type),
    };
  }

  private async getSiteForUser(userId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, deletedAt: null },
      include: { credential: { select: { kind: true, updatedAt: true } } },
    });
    if (!site) throw new NotFoundException("site_not_found");
    await this.requireMembership(userId, site.organizationId);
    return site;
  }

  private async requireMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId },
      },
    });
    if (
      !membership ||
      ![MembershipRole.owner, MembershipRole.member].includes(membership.role)
    ) {
      throw new ForbiddenException("org_forbidden");
    }
    return membership;
  }

  private toPublic(site: {
    id: string;
    organizationId: string;
    domain: string;
    connectionType: PrismaConnectionType;
    cms: string;
    settings: Prisma.JsonValue;
    healthStatus: string | null;
    createdAt: Date;
    updatedAt: Date;
    credential?: { kind: CredentialKind; updatedAt: Date } | null;
  }) {
    const type = site.connectionType as ConnectionType;
    const caps = getConnectionCapabilities(type);
    const connected =
      type === "url_audit"
        ? site.healthStatus === "healthy"
        : Boolean(site.credential);

    return {
      id: site.id,
      organizationId: site.organizationId,
      domain: site.domain,
      connectionType: type,
      cms: site.cms,
      settings: site.settings,
      healthStatus: site.healthStatus,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
      connected,
      credentialKind: site.credential?.kind ?? null,
      capabilities: caps,
    };
  }
}

function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "");
  d = d.replace(/\/.*$/, "");
  d = d.replace(/:\d+$/, "");
  if (!d || d.includes(" ")) {
    throw new BadRequestException("invalid_domain");
  }
  return d;
}
