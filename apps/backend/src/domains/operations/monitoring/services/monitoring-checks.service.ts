import { Injectable } from '@nestjs/common';
import { MonitoringContext, MonitoringTrigger } from '../monitoring.types';

@Injectable()
export class MonitoringChecksService {
  runAllChecks(ctx: MonitoringContext): MonitoringTrigger[] {
    const triggers: MonitoringTrigger[] = [];

    // HOS Compliance (5 checks)
    this.checkDriveLimitApproaching(ctx, triggers);
    this.checkDutyLimitApproaching(ctx, triggers);
    this.checkBreakRequired(ctx, triggers);
    this.checkCycleApproaching(ctx, triggers);
    this.checkHOSViolation(ctx, triggers);

    // Route Progress (4 checks)
    this.checkAppointmentAtRisk(ctx, triggers);
    this.checkMissedAppointment(ctx, triggers);
    this.checkDockTimeExceeded(ctx, triggers);
    this.checkRouteDelay(ctx, triggers);

    // Driver Behavior (1 check)
    this.checkDriverNotMoving(ctx, triggers);

    // Vehicle State (1 check)
    this.checkFuelLow(ctx, triggers);

    // External (2 checks) — placeholders
    // Weather + road closure deferred (no external API yet)

    return triggers;
  }

  // --- HOS Compliance ---

  private checkDriveLimitApproaching(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    const remainingMin = ctx.hosData.driveTimeRemainingMs / 60000;
    if (remainingMin > 0 && remainingMin <= ctx.thresholds.hosApproachingMinutes) {
      triggers.push({
        type: 'HOS_APPROACHING_LIMIT',
        severity: 'high',
        requiresReplan: false,
        etaImpactMinutes: 0,
        params: { hoursType: 'driving', remainingMinutes: Math.round(remainingMin), driverName: ctx.driverName },
      });
    }
  }

  private checkDutyLimitApproaching(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    const remainingMin = ctx.hosData.shiftTimeRemainingMs / 60000;
    if (remainingMin > 0 && remainingMin <= ctx.thresholds.hosApproachingMinutes) {
      triggers.push({
        type: 'HOS_APPROACHING_LIMIT',
        severity: 'high',
        requiresReplan: false,
        etaImpactMinutes: 0,
        params: { hoursType: 'duty', remainingMinutes: Math.round(remainingMin), driverName: ctx.driverName },
      });
    }
  }

  private checkBreakRequired(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    const breakRemainingMin = ctx.hosData.timeUntilBreakMs / 60000;
    if (breakRemainingMin <= 0) {
      triggers.push({
        type: 'BREAK_REQUIRED',
        severity: 'high',
        requiresReplan: false,
        etaImpactMinutes: 30,
        params: { remainingMinutes: 0, driverName: ctx.driverName },
      });
    }
  }

  private checkCycleApproaching(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    const remainingHours = ctx.hosData.cycleTimeRemainingMs / 3600000;
    if (remainingHours > 0 && remainingHours <= ctx.thresholds.cycleApproachingHours) {
      triggers.push({
        type: 'CYCLE_APPROACHING_LIMIT',
        severity: 'medium',
        requiresReplan: false,
        etaImpactMinutes: 0,
        params: { remainingHours: Math.round(remainingHours * 10) / 10, driverName: ctx.driverName },
      });
    }
  }

  private checkHOSViolation(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    const driveRemaining = ctx.hosData.driveTimeRemainingMs;
    const shiftRemaining = ctx.hosData.shiftTimeRemainingMs;
    const cycleRemaining = ctx.hosData.cycleTimeRemainingMs;

    if (driveRemaining <= 0 && ctx.hosData.currentDutyStatus === 'driving') {
      triggers.push({
        type: 'HOS_VIOLATION',
        severity: 'critical',
        requiresReplan: true,
        etaImpactMinutes: 600,
        params: { hoursType: 'driving', currentHours: '11+', limitHours: '11', driverName: ctx.driverName },
      });
    } else if (shiftRemaining <= 0 && ['driving', 'onDuty'].includes(ctx.hosData.currentDutyStatus)) {
      triggers.push({
        type: 'HOS_VIOLATION',
        severity: 'critical',
        requiresReplan: true,
        etaImpactMinutes: 600,
        params: { hoursType: 'duty', currentHours: '14+', limitHours: '14', driverName: ctx.driverName },
      });
    } else if (cycleRemaining <= 0) {
      triggers.push({
        type: 'HOS_VIOLATION',
        severity: 'critical',
        requiresReplan: true,
        etaImpactMinutes: 2040,
        params: { hoursType: 'cycle', currentHours: '70+', limitHours: '70', driverName: ctx.driverName },
      });
    }
  }

  // --- Route Progress ---

  private checkAppointmentAtRisk(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    if (!ctx.currentSegment?.appointmentWindow) return;
    const window = ctx.currentSegment.appointmentWindow;
    if (!window.start) return;

    const windowStart = new Date(window.start).getTime();
    const eta = ctx.currentSegment.estimatedArrival
      ? new Date(ctx.currentSegment.estimatedArrival).getTime()
      : null;
    if (!eta) return;

    const bufferMs = ctx.thresholds.appointmentAtRiskMinutes * 60000;
    if (eta > windowStart - bufferMs && eta <= windowStart) {
      triggers.push({
        type: 'APPOINTMENT_AT_RISK',
        severity: 'high',
        requiresReplan: false,
        etaImpactMinutes: Math.round((eta - windowStart) / 60000),
        params: { stopName: ctx.currentSegment.toLocation, driverName: ctx.driverName },
      });
    }
  }

  private checkMissedAppointment(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    if (!ctx.currentSegment?.appointmentWindow) return;
    const window = ctx.currentSegment.appointmentWindow;
    if (!window.end) return;

    const windowEnd = new Date(window.end).getTime();
    if (Date.now() > windowEnd && ctx.currentSegment.status !== 'completed') {
      triggers.push({
        type: 'MISSED_APPOINTMENT',
        severity: 'critical',
        requiresReplan: true,
        etaImpactMinutes: Math.round((Date.now() - windowEnd) / 60000),
        params: { stopName: ctx.currentSegment.toLocation, scheduledTime: window.end, driverName: ctx.driverName },
      });
    }
  }

  private checkDockTimeExceeded(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    if (ctx.currentSegment?.segmentType !== 'dock') return;
    if (ctx.currentSegment.status !== 'in_progress') return;

    const plannedDockMs = (ctx.currentSegment.dockDurationHours ?? 0) * 3600000;
    const actualStart = ctx.currentSegment.actualArrival
      ? new Date(ctx.currentSegment.actualArrival).getTime()
      : null;
    if (!actualStart) return;

    const actualDockMs = Date.now() - actualStart;
    const thresholdMs = ctx.thresholds.dockTimeExceededMinutes * 60000;

    if (actualDockMs > plannedDockMs + thresholdMs) {
      const excessMinutes = Math.round((actualDockMs - plannedDockMs) / 60000);
      triggers.push({
        type: 'DOCK_TIME_EXCEEDED',
        severity: 'high',
        requiresReplan: true,
        etaImpactMinutes: excessMinutes,
        params: { stopName: ctx.currentSegment.toLocation, excessMinutes, driverName: ctx.driverName },
      });
    }
  }

  private checkRouteDelay(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    if (!ctx.plan.estimatedArrival) return;
    if (!ctx.currentSegment?.estimatedArrival) return;

    const plannedEta = new Date(ctx.currentSegment.estimatedArrival).getTime();
    const now = Date.now();
    if (now > plannedEta && ctx.currentSegment.status === 'in_progress') {
      const delayMin = Math.round((now - plannedEta) / 60000);
      if (delayMin >= ctx.thresholds.routeDelayMinutes) {
        triggers.push({
          type: 'ROUTE_DELAY',
          severity: delayMin > 60 ? 'high' : 'medium',
          requiresReplan: delayMin > 60,
          etaImpactMinutes: delayMin,
          params: { delayMinutes: delayMin, driverName: ctx.driverName },
        });
      }
    }
  }

  // --- Driver Behavior ---

  private checkDriverNotMoving(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    if (ctx.currentSegment?.segmentType !== 'drive') return;
    if (ctx.gpsData?.speed > 0) return;

    const stoppedSince = ctx.currentSegment.estimatedDeparture
      ? new Date(ctx.currentSegment.estimatedDeparture).getTime()
      : ctx.gpsData?.timestamp
        ? new Date(ctx.gpsData.timestamp).getTime()
        : null;

    if (!stoppedSince) return;

    const stoppedMinutes = (Date.now() - stoppedSince) / 60000;
    if (stoppedMinutes >= ctx.thresholds.driverNotMovingMinutes) {
      triggers.push({
        type: 'DRIVER_NOT_MOVING',
        severity: 'medium',
        requiresReplan: false,
        etaImpactMinutes: Math.round(stoppedMinutes),
        params: { stoppedMinutes: Math.round(stoppedMinutes), driverName: ctx.driverName },
      });
    }
  }

  // --- Vehicle State ---

  private checkFuelLow(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    const fuelState = ctx.currentSegment?.fuelStateAfter;
    if (!fuelState?.fuelPercent) return;

    if (fuelState.fuelPercent < ctx.thresholds.fuelLowPercent) {
      triggers.push({
        type: 'FUEL_LOW',
        severity: 'medium',
        requiresReplan: false,
        etaImpactMinutes: 0,
        params: { fuelPercent: fuelState.fuelPercent, driverName: ctx.driverName },
      });
    }
  }
}
