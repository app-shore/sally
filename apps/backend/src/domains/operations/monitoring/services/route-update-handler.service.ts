import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AlertTriggersService } from '../../alerts/services/alert-triggers.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';
import { MonitoringTrigger } from '../monitoring.types';

@Injectable()
export class RouteUpdateHandlerService {
  private readonly logger = new Logger(RouteUpdateHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertTriggers: AlertTriggersService,
    private readonly sse: SseService,
  ) {}

  async handleTriggers(
    triggers: MonitoringTrigger[],
    plan: { planId: string; id: number; tenantId: number; planVersion: number },
    driverId: string,
  ): Promise<void> {
    if (triggers.length === 0) return;

    const needsReplan = triggers.some((t) => t.requiresReplan && t.etaImpactMinutes > 30);
    const maxEtaImpact = Math.max(...triggers.map((t) => t.etaImpactMinutes));

    for (const trigger of triggers) {
      // 1. Fire alert
      await this.alertTriggers.trigger(trigger.type, plan.tenantId, driverId, {
        ...trigger.params,
        routePlanId: plan.planId,
        priority: trigger.severity,
      });

      // 2. Record RoutePlanUpdate for audit trail
      const updateId = `UPD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      await this.prisma.routePlanUpdate.create({
        data: {
          updateId,
          planId: plan.id,
          updateType: trigger.type,
          triggeredAt: new Date(),
          triggeredBy: 'monitoring_daemon',
          triggerData: trigger.params,
          replanTriggered: trigger.requiresReplan && trigger.etaImpactMinutes > 30,
          replanReason: trigger.requiresReplan ? `${trigger.type}: ETA impact ${trigger.etaImpactMinutes}min` : null,
          previousPlanVersion: trigger.requiresReplan ? plan.planVersion : null,
          newPlanVersion: trigger.requiresReplan ? plan.planVersion + 1 : null,
          impactSummary: {
            etaChangeMinutes: trigger.etaImpactMinutes,
            alertsFired: 1,
            severity: trigger.severity,
          },
        },
      });

      // 3. Emit SSE event
      this.sse.emitToTenant(plan.tenantId, 'monitoring:trigger_fired', {
        planId: plan.planId,
        triggerType: trigger.type,
        severity: trigger.severity,
        requiresReplan: trigger.requiresReplan,
        etaImpactMinutes: trigger.etaImpactMinutes,
        params: trigger.params,
        timestamp: new Date().toISOString(),
      });
    }

    // 4. If ETA shift needed (but no full replan), emit update event
    if (!needsReplan && maxEtaImpact > 0) {
      this.sse.emitToTenant(plan.tenantId, 'route:updated', {
        planId: plan.planId,
        etaShiftMinutes: maxEtaImpact,
      });
    }

    // 5. If replan needed, emit replan event
    if (needsReplan) {
      this.logger.warn(`Route ${plan.planId} needs re-plan. ETA impact: ${maxEtaImpact}min`);
      this.sse.emitToTenant(plan.tenantId, 'route:replanned', {
        planId: plan.planId,
        reason: triggers.filter((t) => t.requiresReplan).map((t) => t.type).join(', '),
      });
    }
  }
}
