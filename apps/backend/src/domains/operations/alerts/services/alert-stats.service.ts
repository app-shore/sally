import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AlertCacheService } from './alert-cache.service';

export interface AlertStats {
  active: number;
  critical: number;
  avgResponseTimeMinutes: number;
  resolvedToday: number;
}

@Injectable()
export class AlertStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AlertCacheService,
  ) {}

  async getStats(tenantId: number): Promise<AlertStats> {
    const cacheKey = `stats:${tenantId}`;
    const cached = this.cache.get<AlertStats>(cacheKey);
    if (cached) return cached;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [active, critical, resolvedToday, acknowledgedToday] =
      await Promise.all([
        this.prisma.alert.count({
          where: { tenantId, status: 'active' },
        }),
        this.prisma.alert.count({
          where: { tenantId, status: 'active', priority: 'critical' },
        }),
        this.prisma.alert.count({
          where: {
            tenantId,
            status: { in: ['resolved', 'auto_resolved'] },
            resolvedAt: { gte: todayStart },
          },
        }),
        this.prisma.alert.findMany({
          where: {
            tenantId,
            acknowledgedAt: { not: null, gte: todayStart },
          },
          select: { createdAt: true, acknowledgedAt: true },
        }),
      ]);

    let avgResponseTimeMinutes = 0;
    if (acknowledgedToday.length > 0) {
      const totalMs = acknowledgedToday.reduce((sum, alert) => {
        const diff =
          alert.acknowledgedAt!.getTime() - alert.createdAt.getTime();
        return sum + diff;
      }, 0);
      avgResponseTimeMinutes = Math.round(
        totalMs / acknowledgedToday.length / 60000,
      );
    }

    const result = { active, critical, avgResponseTimeMinutes, resolvedToday };
    this.cache.set(cacheKey, result, 30);
    return result;
  }
}
