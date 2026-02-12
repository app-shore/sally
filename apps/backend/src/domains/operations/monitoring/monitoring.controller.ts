import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TenantDbId } from '../../../auth/decorators/tenant-db-id.decorator';
import { RouteProgressTrackerService } from './services/route-progress-tracker.service';
import { IntegrationManagerService } from '../../integrations/services/integration-manager.service';
import { RouteEventService } from './services/route-event.service';
import { ReportDockTimeSchema } from './dto/report-dock-time.dto';
import { ReportDelaySchema } from './dto/report-delay.dto';

@Controller('api/v1/routes')
export class MonitoringController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressTracker: RouteProgressTrackerService,
    private readonly integrationManager: IntegrationManagerService,
    private readonly routeEventService: RouteEventService,
  ) {}

  @Get(':planId/monitoring')
  async getMonitoringStatus(
    @Param('planId') planId: string,
    @TenantDbId() tenantId: number,
  ) {
    const plan = await this.prisma.routePlan.findFirst({
      where: { planId, tenantId },
      include: {
        segments: { orderBy: { sequenceOrder: 'asc' } },
        driver: true,
        vehicle: true,
        events: { orderBy: { occurredAt: 'desc' }, take: 10 },
      },
    });

    if (!plan) throw new Error(`Route plan ${planId} not found`);

    const currentSegment = this.progressTracker.determineCurrentSegment(plan.segments);
    const completedSegments = plan.segments.filter((s: any) => s.status === 'completed').length;

    const activeAlerts = await this.prisma.alert.count({
      where: { routePlanId: planId, tenantId, status: 'active' },
    });

    let hosState = null;
    try {
      const hosData = await this.integrationManager.getDriverHOS(tenantId, plan.driver.driverId);
      hosState = {
        currentDutyStatus: hosData.currentDutyStatus ?? 'unknown',
        driveTimeRemainingMinutes: Math.round((hosData.driveTimeRemainingMs ?? 0) / 60000),
        shiftTimeRemainingMinutes: Math.round((hosData.shiftTimeRemainingMs ?? 0) / 60000),
        cycleTimeRemainingMinutes: Math.round((hosData.cycleTimeRemainingMs ?? 0) / 60000),
        timeUntilBreakMinutes: Math.round((hosData.timeUntilBreakMs ?? 0) / 60000),
      };
    } catch { /* HOS unavailable */ }

    let driverPosition = null;
    try {
      const gps = await this.integrationManager.getVehicleLocation(tenantId, plan.vehicle.vehicleId);
      driverPosition = {
        lat: gps.gps.latitude,
        lon: gps.gps.longitude,
        speed: gps.gps.speedMilesPerHour,
        heading: gps.gps.headingDegrees,
        lastUpdated: gps.gps.time,
      };
    } catch { /* GPS unavailable */ }

    const etaDeviation = this.calculateEtaDeviation(plan, currentSegment);

    return {
      planId: plan.planId,
      currentSegment: currentSegment
        ? { segmentId: currentSegment.segmentId, sequenceOrder: currentSegment.sequenceOrder, segmentType: currentSegment.segmentType, status: currentSegment.status }
        : null,
      driverPosition,
      hosState,
      etaDeviation,
      completedSegments,
      totalSegments: plan.segments.length,
      activeAlerts,
      lastChecked: new Date().toISOString(),
      recentEvents: plan.events,
    };
  }

  @Get(':planId/updates')
  async getUpdates(
    @Param('planId') planId: string,
    @TenantDbId() tenantId: number,
  ) {
    const plan = await this.prisma.routePlan.findFirst({
      where: { planId, tenantId },
      select: { id: true },
    });
    if (!plan) throw new Error(`Route plan ${planId} not found`);

    return this.prisma.routeEvent.findMany({
      where: { planId: plan.id },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    });
  }

  @Post(':planId/events/dock-time')
  async reportDockTime(
    @Param('planId') planId: string,
    @Body() body: any,
    @TenantDbId() tenantId: number,
  ) {
    const dto = ReportDockTimeSchema.parse(body);
    const plan = await this.prisma.routePlan.findFirst({
      where: { planId, tenantId },
      include: { driver: true },
    });
    if (!plan) throw new Error(`Route plan ${planId} not found`);

    await this.routeEventService.handleMonitoringTriggers(
      [{ type: 'DOCK_TIME_EXCEEDED', severity: 'high', requiresReplan: true, etaImpactMinutes: Math.round(dto.actualDockHours * 60), params: { actualDockHours: dto.actualDockHours, driverName: plan.driver.name } }],
      { planId: plan.planId, id: plan.id, tenantId, planVersion: plan.planVersion },
      plan.driver.driverId,
    );

    return { status: 'reported' };
  }

  @Post(':planId/events/delay')
  async reportDelay(
    @Param('planId') planId: string,
    @Body() body: any,
    @TenantDbId() tenantId: number,
  ) {
    const dto = ReportDelaySchema.parse(body);
    const plan = await this.prisma.routePlan.findFirst({
      where: { planId, tenantId },
      include: { driver: true },
    });
    if (!plan) throw new Error(`Route plan ${planId} not found`);

    await this.routeEventService.handleMonitoringTriggers(
      [{ type: 'ROUTE_DELAY', severity: dto.delayMinutes > 60 ? 'high' : 'medium', requiresReplan: dto.delayMinutes > 60, etaImpactMinutes: dto.delayMinutes, params: { delayMinutes: dto.delayMinutes, reason: dto.reason, driverName: plan.driver.name } }],
      { planId: plan.planId, id: plan.id, tenantId, planVersion: plan.planVersion },
      plan.driver.driverId,
    );

    return { status: 'reported' };
  }

  private calculateEtaDeviation(plan: any, currentSegment: any): { minutes: number; status: 'on_time' | 'at_risk' | 'late' } {
    if (!plan.estimatedArrival || !currentSegment) {
      return { minutes: 0, status: 'on_time' };
    }
    const now = Date.now();
    const eta = new Date(currentSegment.estimatedArrival).getTime();
    const diff = Math.round((now - eta) / 60000);

    if (diff < 0) return { minutes: 0, status: 'on_time' };
    if (diff < 30) return { minutes: diff, status: 'at_risk' };
    return { minutes: diff, status: 'late' };
  }
}
