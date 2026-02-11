import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

interface EscalationPolicy {
  acknowledgeSlaMinutes: number;
  escalateTo: string;
  channels: string[];
}

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sseService: SseService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkEscalations() {
    try {
      this.logger.debug('Checking for alerts requiring escalation...');

      const configs = await this.prisma.alertConfiguration.findMany();

      for (const config of configs) {
        const policy = config.escalationPolicy as unknown as Record<string, EscalationPolicy>;
        if (!policy) continue;

        for (const [priority, rules] of Object.entries(policy)) {
          const slaMs = rules.acknowledgeSlaMinutes * 60000;
          const cutoff = new Date(Date.now() - slaMs);

          const overdueAlerts = await this.prisma.alert.findMany({
            where: {
              tenantId: config.tenantId,
              priority,
              status: 'active',
              acknowledgedAt: null,
              createdAt: { lte: cutoff },
              escalationLevel: 0,
            },
          });

          for (const alert of overdueAlerts) {
            const updated = await this.prisma.alert.update({
              where: { alertId: alert.alertId },
              data: {
                escalationLevel: alert.escalationLevel + 1,
                escalatedAt: new Date(),
              },
            });

            this.logger.warn(
              `Escalated alert ${alert.alertId} (${priority}) to level ${updated.escalationLevel} — SLA of ${rules.acknowledgeSlaMinutes}min exceeded`,
            );

            this.sseService.emitToTenant(config.tenantId, 'alert:escalated', {
              alert_id: alert.alertId,
              priority: alert.priority,
              escalation_level: updated.escalationLevel,
              escalate_to: rules.escalateTo,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Alert escalation check failed', error.stack);
    }
  }
}
