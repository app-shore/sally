import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

interface HistoryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  priority?: string;
  status?: string;
  driverId?: string;
}

@Injectable()
export class AlertAnalyticsService {
  private readonly logger = new Logger(AlertAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getVolumeByCategory(tenantId: number, days: number) {
    const startDate = new Date(Date.now() - days * 86400000);

    const groups = await this.prisma.alert.groupBy({
      by: ['category'],
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      _count: { id: true },
    });

    return groups.map((g) => ({
      category: g.category,
      count: g._count.id,
    }));
  }

  async getVolumeByPriority(tenantId: number, days: number) {
    const startDate = new Date(Date.now() - days * 86400000);

    const groups = await this.prisma.alert.groupBy({
      by: ['priority'],
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      _count: { id: true },
    });

    return groups.map((g) => ({
      priority: g.priority,
      count: g._count.id,
    }));
  }

  async getResponseTimeTrend(tenantId: number, days: number) {
    const startDate = new Date(Date.now() - days * 86400000);

    const alerts = await this.prisma.alert.findMany({
      where: {
        tenantId,
        acknowledgedAt: { not: null },
        createdAt: { gte: startDate },
      },
      select: { createdAt: true, acknowledgedAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, { total: number; count: number }>();

    for (const alert of alerts) {
      const date = alert.createdAt.toISOString().split('T')[0];
      const responseMs = alert.acknowledgedAt!.getTime() - alert.createdAt.getTime();
      const responseMinutes = responseMs / 60000;

      const entry = dailyMap.get(date) || { total: 0, count: 0 };
      entry.total += responseMinutes;
      entry.count += 1;
      dailyMap.set(date, entry);
    }

    return Array.from(dailyMap.entries()).map(([date, { total, count }]) => ({
      date,
      avgResponseMinutes: Math.round(total / count),
      alertCount: count,
    }));
  }

  async getResolutionRates(tenantId: number, days: number) {
    const startDate = new Date(Date.now() - days * 86400000);

    const [total, resolved, autoResolved, escalated] = await Promise.all([
      this.prisma.alert.count({ where: { tenantId, createdAt: { gte: startDate } } }),
      this.prisma.alert.count({ where: { tenantId, status: 'resolved', createdAt: { gte: startDate } } }),
      this.prisma.alert.count({ where: { tenantId, autoResolved: true, createdAt: { gte: startDate } } }),
      this.prisma.alert.count({ where: { tenantId, escalationLevel: { gt: 0 }, createdAt: { gte: startDate } } }),
    ]);

    return {
      total,
      resolved,
      autoResolved,
      escalated,
      resolutionRate: total > 0 ? Math.round(((resolved + autoResolved) / total) * 100) : 0,
      escalationRate: total > 0 ? Math.round((escalated / total) * 100) : 0,
    };
  }

  async getTopAlertTypes(tenantId: number, days: number, limit = 10) {
    const startDate = new Date(Date.now() - days * 86400000);

    const groups = await this.prisma.alert.groupBy({
      by: ['alertType'],
      where: { tenantId, createdAt: { gte: startDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    return groups.map((g) => ({
      alertType: g.alertType,
      count: g._count.id,
    }));
  }

  async getAlertHistory(tenantId: number, params: HistoryParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const where: any = { tenantId };

    if (params.startDate) where.createdAt = { gte: new Date(params.startDate) };
    if (params.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(params.endDate) };
    }
    if (params.category) where.category = params.category;
    if (params.priority) where.priority = params.priority;
    if (params.status) where.status = params.status;
    if (params.driverId) where.driverId = params.driverId;

    const [items, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.alert.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
