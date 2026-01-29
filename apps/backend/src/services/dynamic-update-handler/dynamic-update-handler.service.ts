import { Injectable, Logger } from '@nestjs/common';
import { HOSRuleEngineService } from '../hos-rule-engine/hos-rule-engine.service';

const logger = new Logger('DynamicUpdateHandlerService');

export interface UpdateTrigger {
  trigger_type: string;
  priority: string;
  trigger_data: Record<string, unknown>;
  action: string;
  reason: string;
}

export interface ReplanDecision {
  replan_triggered: boolean;
  action: string;
  reason: string;
  priority: string;
  trigger_type: string;
}

@Injectable()
export class DynamicUpdateHandlerService {
  private static readonly TRAFFIC_DELAY_THRESHOLD_MIN = 30;
  private static readonly DOCK_TIME_VARIANCE_THRESHOLD_HOURS = 1;
  private static readonly SPEED_DEVIATION_THRESHOLD_PCT = 0.15;
  private static readonly FUEL_LOW_THRESHOLD = 0.25;
  private static readonly HOS_WARNING_THRESHOLD_HOURS = 2;

  constructor(private readonly hosEngine: HOSRuleEngineService) {}

  shouldReplan(currentPlan: unknown, triggerType: string, triggerData: Record<string, unknown>, priority: string): { replan_triggered: boolean; reason: string } {
    // Priority-based decision
    if (priority === 'CRITICAL') {
      return { replan_triggered: true, reason: 'Critical safety/compliance issue' };
    }

    if (priority === 'HIGH') {
      const impactHours = 1.5; // Placeholder
      if (impactHours > 1) {
        return { replan_triggered: true, reason: `High impact: ${impactHours.toFixed(1)}h` };
      }
      return { replan_triggered: false, reason: 'Impact below threshold' };
    }

    if (priority === 'MEDIUM') {
      return { replan_triggered: false, reason: 'Medium priority, ETA adjustment sufficient' };
    }

    return { replan_triggered: false, reason: 'Low priority' };
  }

  checkTrafficUpdates(planId: string, currentSegmentId: string): UpdateTrigger | null {
    // MVP: Manual report (no live API)
    const trafficDelayMinutes = 0;
    if (trafficDelayMinutes >= DynamicUpdateHandlerService.TRAFFIC_DELAY_THRESHOLD_MIN) {
      const priority = trafficDelayMinutes > 60 ? 'HIGH' : 'MEDIUM';
      const action = trafficDelayMinutes > 60 ? 'ADJUST_ROUTE_OR_INSERT_REST' : 'UPDATE_ETAS';
      return { trigger_type: 'traffic_delay', priority, trigger_data: { segment_id: currentSegmentId, delay_minutes: trafficDelayMinutes }, action, reason: `Traffic delay of ${trafficDelayMinutes} minutes detected` };
    }
    return null;
  }

  checkDockTimeChanges(planId: string, segmentId: string, estimatedDockHours: number, actualDockHours: number): UpdateTrigger | null {
    const variance = Math.abs(actualDockHours - estimatedDockHours);
    if (variance >= DynamicUpdateHandlerService.DOCK_TIME_VARIANCE_THRESHOLD_HOURS) {
      return {
        trigger_type: 'dock_time_change',
        priority: 'CRITICAL',
        trigger_data: { segment_id: segmentId, estimated_hours: estimatedDockHours, actual_hours: actualDockHours, variance_hours: variance },
        action: 'INSERT_REST_OR_SKIP_STOPS',
        reason: `Dock time exceeded estimate by ${variance.toFixed(1)} hours. Route feasibility may be affected.`,
      };
    }
    return null;
  }

  checkLoadChanges(planId: string, changeType: string, stopData?: Record<string, unknown>): UpdateTrigger | null {
    if (changeType !== 'load_added' && changeType !== 'load_cancelled') return null;
    return {
      trigger_type: changeType,
      priority: 'HIGH',
      trigger_data: stopData ? { stop_data: stopData } : {},
      action: 'RE_SEQUENCE_STOPS',
      reason: `Load ${changeType.split('_')[1]}: Route must be re-sequenced`,
    };
  }

  checkDriverRestRequests(planId: string, driverId: string, restLocation?: Record<string, unknown>): UpdateTrigger | null {
    return {
      trigger_type: 'driver_rest_request',
      priority: 'HIGH',
      trigger_data: { driver_id: driverId, rest_location: restLocation || {} },
      action: 'UPDATE_HOS_AND_REPLAN',
      reason: 'Driver requested rest stop. Safety override.',
    };
  }

  checkHosApproachingLimits(planId: string, driverId: string, driverHos: Record<string, number>, remainingRoute: Array<Record<string, number>>): UpdateTrigger | null {
    const hoursDriven = driverHos.hours_driven;
    const onDutyTime = driverHos.on_duty_time;
    const hoursSinceBreak = driverHos.hours_since_break;

    const hoursUntilDriveLimit = 11 - hoursDriven;
    const hoursUntilDutyLimit = 14 - onDutyTime;
    const hoursUntilBreakRequired = 8 - hoursSinceBreak;

    const totalDriveNeeded = remainingRoute.reduce((sum, seg) => sum + (seg.drive_time_hours || 0), 0);
    const totalDutyNeeded = remainingRoute.reduce((sum, seg) => sum + (seg.drive_time_hours || 0) + (seg.dock_time_hours || 0), 0);

    if (hoursUntilDriveLimit < totalDriveNeeded) {
      const shortfall = totalDriveNeeded - hoursUntilDriveLimit;
      return {
        trigger_type: 'hos_drive_limit_approaching',
        priority: 'HIGH',
        trigger_data: { hours_remaining: hoursUntilDriveLimit, hours_needed: totalDriveNeeded, shortfall },
        action: 'INSERT_REST_STOP',
        reason: `Drive limit approaching: ${hoursUntilDriveLimit.toFixed(1)}h remaining, ${totalDriveNeeded.toFixed(1)}h needed. Shortfall: ${shortfall.toFixed(1)}h`,
      };
    }

    if (hoursUntilDutyLimit < totalDutyNeeded) {
      const shortfall = totalDutyNeeded - hoursUntilDutyLimit;
      return {
        trigger_type: 'hos_duty_limit_approaching',
        priority: 'HIGH',
        trigger_data: { hours_remaining: hoursUntilDutyLimit, hours_needed: totalDutyNeeded, shortfall },
        action: 'INSERT_REST_STOP',
        reason: `Duty limit approaching: ${hoursUntilDutyLimit.toFixed(1)}h remaining, ${totalDutyNeeded.toFixed(1)}h needed. Shortfall: ${shortfall.toFixed(1)}h`,
      };
    }

    if (hoursUntilBreakRequired < 1) {
      return {
        trigger_type: 'break_required_soon',
        priority: 'MEDIUM',
        trigger_data: { minutes_until_break: hoursUntilBreakRequired * 60 },
        action: 'INSERT_BREAK',
        reason: `30-minute break required in ${(hoursUntilBreakRequired * 60).toFixed(0)} minutes`,
      };
    }

    return null;
  }

  checkHosViolations(planId: string, driverId: string, driverHos: Record<string, number>): UpdateTrigger | null {
    if (driverHos.hours_driven > 11) {
      return {
        trigger_type: 'hos_violation_drive',
        priority: 'CRITICAL',
        trigger_data: { hours_driven: driverHos.hours_driven },
        action: 'MANDATORY_REST_IMMEDIATE',
        reason: `CRITICAL: Drive limit exceeded (${driverHos.hours_driven.toFixed(1)}h / 11h). Mandatory rest required IMMEDIATELY.`,
      };
    }

    if (driverHos.on_duty_time > 14) {
      return {
        trigger_type: 'hos_violation_duty',
        priority: 'CRITICAL',
        trigger_data: { on_duty_hours: driverHos.on_duty_time },
        action: 'MANDATORY_REST_IMMEDIATE',
        reason: `CRITICAL: Duty limit exceeded (${driverHos.on_duty_time.toFixed(1)}h / 14h). Mandatory rest required IMMEDIATELY.`,
      };
    }

    if (driverHos.hours_since_break > 8) {
      return {
        trigger_type: 'break_violation',
        priority: 'CRITICAL',
        trigger_data: { hours_since_break: driverHos.hours_since_break },
        action: 'MANDATORY_BREAK_IMMEDIATE',
        reason: `CRITICAL: Break requirement exceeded (${driverHos.hours_since_break.toFixed(1)}h / 8h). Mandatory 30-minute break required IMMEDIATELY.`,
      };
    }

    return null;
  }
}
