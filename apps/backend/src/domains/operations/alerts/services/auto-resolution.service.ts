import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

@Injectable()
export class AutoResolutionService {
  private readonly logger = new Logger(AutoResolutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sseService: SseService,
  ) {}

  async autoResolve(alertId: string, tenantId: number, reason: string) {
    const updated = await this.prisma.alert.update({
      where: { alertId },
      data: {
        status: 'auto_resolved',
        autoResolved: true,
        autoResolveReason: reason,
        resolvedAt: new Date(),
      },
    });

    this.sseService.emitToTenant(tenantId, 'alert:resolved', {
      alert_id: updated.alertId,
      status: 'auto_resolved',
      reason,
    });

    this.logger.log(`Auto-resolved alert ${alertId}: ${reason}`);
    return updated;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async unsnoozeExpired() {
    const now = new Date();

    const expiredSnoozes = await this.prisma.alert.findMany({
      where: {
        status: 'snoozed',
        snoozedUntil: { lte: now },
      },
    });

    for (const alert of expiredSnoozes) {
      await this.prisma.alert.update({
        where: { alertId: alert.alertId },
        data: {
          status: 'active',
          snoozedUntil: null,
        },
      });

      this.sseService.emitToTenant(alert.tenantId, 'alert:unsnoozed', {
        alert_id: alert.alertId,
        status: 'active',
      });

      this.logger.log(`Unsnoozed alert ${alert.alertId} — snooze period expired`);
    }

    if (expiredSnoozes.length > 0) {
      this.logger.log(`Unsnoozed ${expiredSnoozes.length} expired alerts`);
    }
  }

  async autoResolveByCondition(
    tenantId: number,
    driverId: string,
    alertType: string,
    reason: string,
  ) {
    const activeAlerts = await this.prisma.alert.findMany({
      where: {
        tenantId,
        driverId,
        alertType,
        status: { in: ['active', 'acknowledged', 'snoozed'] },
      },
    });

    for (const alert of activeAlerts) {
      await this.autoResolve(alert.alertId, tenantId, reason);
    }

    return activeAlerts.length;
  }
}
