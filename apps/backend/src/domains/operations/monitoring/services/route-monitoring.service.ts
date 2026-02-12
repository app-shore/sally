import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IntegrationManagerService } from '../../../integrations/services/integration-manager.service';
import { MonitoringChecksService } from './monitoring-checks.service';
import { RouteProgressTrackerService } from './route-progress-tracker.service';
import { RouteEventService } from './route-event.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';
import { DEFAULT_THRESHOLDS } from '../monitoring.types';

@Injectable()
export class RouteMonitoringService {
  private readonly logger = new Logger(RouteMonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationManager: IntegrationManagerService,
    private readonly checks: MonitoringChecksService,
    private readonly progressTracker: RouteProgressTrackerService,
    private readonly routeEventService: RouteEventService,
    private readonly sse: SseService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async monitorActiveRoutes(): Promise<void> {
    const plans = await this.prisma.routePlan.findMany({
      where: { isActive: true, status: 'active' },
      include: {
        segments: { orderBy: { sequenceOrder: 'asc' } },
        driver: true,
        vehicle: true,
      },
    });

    if (plans.length === 0) return;

    let totalTriggers = 0;

    for (const plan of plans) {
      try {
        const triggers = await this.monitorSingleRoute(plan);
        totalTriggers += triggers;
      } catch (error) {
        this.logger.error(
          `Failed to monitor route ${plan.planId}: ${error.message}`,
          error.stack,
        );
      }
    }

    // Emit cycle complete event
    const tenantIds = [...new Set(plans.map((p) => p.tenantId))];
    for (const tenantId of tenantIds) {
      this.sse.emitToTenant(tenantId, 'monitoring:cycle_complete', {
        routesMonitored: plans.filter((p) => p.tenantId === tenantId).length,
        totalTriggers,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.log(`Monitored ${plans.length} routes, ${totalTriggers} triggers fired`);
  }

  private async monitorSingleRoute(plan: any): Promise<number> {
    // a. Fetch real-time HOS
    const hosData = await this.integrationManager.getDriverHOS(
      plan.tenantId,
      plan.driver.driverId,
    );

    // b. Fetch real-time GPS
    let gpsData: any = null;
    try {
      gpsData = await this.integrationManager.getVehicleLocation(
        plan.tenantId,
        plan.vehicle.vehicleId,
      );
    } catch (error) {
      this.logger.warn(`GPS fetch failed for ${plan.planId}: ${error.message}`);
    }

    // c. Update segment statuses based on GPS position
    const currentSegment = gpsData
      ? await this.progressTracker.updateSegmentStatuses(
          plan.segments,
          gpsData,
          this.routeEventService,
          { planId: plan.id, planStringId: plan.planId, tenantId: plan.tenantId },
        )
      : this.progressTracker.determineCurrentSegment(plan.segments);

    // d. Run all monitoring checks
    const triggers = this.checks.runAllChecks({
      plan,
      segments: plan.segments,
      currentSegment,
      hosData,
      gpsData,
      thresholds: DEFAULT_THRESHOLDS,
      driverName: plan.driver.name ?? plan.driver.driverId,
    });

    // e. Handle triggers
    if (triggers.length > 0) {
      await this.routeEventService.handleMonitoringTriggers(
        triggers,
        { planId: plan.planId, id: plan.id, tenantId: plan.tenantId, planVersion: plan.planVersion },
        plan.driver.driverId,
      );
    }

    return triggers.length;
  }
}
