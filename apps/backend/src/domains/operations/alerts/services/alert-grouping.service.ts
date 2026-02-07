import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

// Maps alert types to their potential parent (cascading) types
const CASCADE_MAP: Record<string, string[]> = {
  HOS_VIOLATION: ['HOS_APPROACHING_LIMIT'],
  BREAK_REQUIRED: ['HOS_APPROACHING_LIMIT'],
  MISSED_APPOINTMENT: ['APPOINTMENT_AT_RISK'],
  FUEL_EMPTY: ['FUEL_LOW'],
};

@Injectable()
export class AlertGroupingService {
  private readonly logger = new Logger(AlertGroupingService.name);

  constructor(private readonly prisma: PrismaService) {}

  generateDedupKey(tenantId: number, driverId: string, alertType: string): string {
    return `${tenantId}:${driverId}:${alertType}`;
  }

  generateGroupKey(tenantId: number, driverId: string, category: string): string {
    return `${tenantId}:${driverId}:${category}`;
  }

  async findDuplicate(dedupKey: string, windowMinutes: number) {
    const windowStart = new Date(Date.now() - windowMinutes * 60000);

    return this.prisma.alert.findFirst({
      where: {
        dedupKey,
        status: { in: ['active', 'acknowledged'] },
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findParentAlert(tenantId: number, driverId: string, alertType: string) {
    const parentTypes = CASCADE_MAP[alertType];
    if (!parentTypes || parentTypes.length === 0) return null;

    return this.prisma.alert.findFirst({
      where: {
        tenantId,
        driverId,
        alertType: { in: parentTypes },
        status: { in: ['active', 'acknowledged'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGroupingConfig(tenantId: number) {
    const config = await this.prisma.alertConfiguration.findUnique({
      where: { tenantId },
    });

    return (config?.groupingConfig as unknown as {
      dedupWindowMinutes: number;
      groupSameTypePerDriver: boolean;
      smartGroupAcrossDrivers: boolean;
      linkCascading: boolean;
    }) || {
      dedupWindowMinutes: 15,
      groupSameTypePerDriver: true,
      smartGroupAcrossDrivers: true,
      linkCascading: true,
    };
  }

  async linkToParent(alertId: string, parentAlertId: string) {
    return this.prisma.alert.update({
      where: { alertId },
      data: { parentAlertId },
    });
  }
}
