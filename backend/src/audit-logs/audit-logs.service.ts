import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Record a write action. Never throws — audit logging is best-effort and
   * should never break the operation it's attached to.
   */
  async log(params: {
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId || undefined,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          metadata: params.metadata as any,
          ipAddress: params.ipAddress,
        },
      });
    } catch {
      // best-effort — swallow so a logging failure never breaks the request
    }
  }

  async findAll(params: {
    action?: string;
    entity?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 25;

    const where: any = {};
    if (params.action) where.action = params.action;
    if (params.entity) where.entity = params.entity;
    if (params.userId) where.userId = params.userId;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pageCount: Math.ceil(total / limit) } };
  }

  /** Distinct action/entity values, used to populate filter dropdowns in the UI. */
  async getFilterOptions() {
    const [actions, entities] = await Promise.all([
      this.prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
      this.prisma.auditLog.findMany({ distinct: ['entity'], select: { entity: true }, orderBy: { entity: 'asc' } }),
    ]);
    return {
      actions: actions.map((a) => a.action),
      entities: entities.map((e) => e.entity),
    };
  }
}
