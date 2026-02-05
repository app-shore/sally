import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../../../config/configuration';
import { validateHours, validatePositive } from '../../../../shared/utils/validators';

const ComplianceStatus = {
  COMPLIANT: 'compliant',
  NON_COMPLIANT: 'non_compliant',
  WARNING: 'warning',
} as const;

const logger = new Logger('HOSRuleEngineService');

export interface HOSState {
  hours_driven: number;
  on_duty_time: number;
  hours_since_break: number;
}

export interface ComplianceCheck {
  rule_name: string;
  is_compliant: boolean;
  current_value: number;
  limit_value: number;
  remaining: number;
  message: string;
}

export interface HOSComplianceResult {
  status: string;
  is_compliant: boolean;
  checks: ComplianceCheck[];
  warnings: string[];
  violations: string[];
  hours_remaining_to_drive: number;
  hours_remaining_on_duty: number;
  break_required: boolean;
  rest_required: boolean;
}

@Injectable()
export class HOSRuleEngineService {
  private readonly maxDriveHours: number;
  private readonly maxDutyHours: number;
  private readonly requiredBreakMinutes: number;
  private readonly breakTriggerHours: number;
  private readonly minRestHours: number;

  constructor(private readonly configService: ConfigService<Configuration>) {
    this.maxDriveHours = this.configService.get<number>('maxDriveHours', 11.0);
    this.maxDutyHours = this.configService.get<number>('maxDutyHours', 14.0);
    this.requiredBreakMinutes = this.configService.get<number>(
      'requiredBreakMinutes',
      30,
    );
    this.breakTriggerHours = this.configService.get<number>(
      'breakTriggerHours',
      8.0,
    );
    this.minRestHours = this.configService.get<number>('minRestHours', 10.0);
  }

  validateCompliance(
    hoursDriven: number,
    onDutyTime: number,
    hoursSinceBreak: number,
    lastRestPeriod?: number,
  ): HOSComplianceResult {
    // Validate inputs
    validateHours(hoursDriven, 'hours_driven');
    validateHours(onDutyTime, 'on_duty_time');
    validateHours(hoursSinceBreak, 'hours_since_break');
    validatePositive(hoursDriven, 'hours_driven');
    validatePositive(onDutyTime, 'on_duty_time');
    validatePositive(hoursSinceBreak, 'hours_since_break');

    const checks: ComplianceCheck[] = [];
    const warnings: string[] = [];
    const violations: string[] = [];

    // Check 1: 11-hour driving limit
    const driveCheck = this.checkDriveLimit(hoursDriven);
    checks.push(driveCheck);
    if (!driveCheck.is_compliant) {
      violations.push(driveCheck.message);
    } else if (driveCheck.remaining <= 1.0) {
      warnings.push(`Warning: ${driveCheck.message}`);
    }

    // Check 2: 14-hour on-duty window
    const dutyCheck = this.checkDutyLimit(onDutyTime);
    checks.push(dutyCheck);
    if (!dutyCheck.is_compliant) {
      violations.push(dutyCheck.message);
    } else if (dutyCheck.remaining <= 1.0) {
      warnings.push(`Warning: ${dutyCheck.message}`);
    }

    // Check 3: 30-minute break requirement
    const breakCheck = this.checkBreakRequirement(hoursSinceBreak);
    checks.push(breakCheck);
    if (!breakCheck.is_compliant) {
      violations.push(breakCheck.message);
    }

    // Determine overall compliance status
    const isCompliant = checks.every((check) => check.is_compliant);

    let status: string;
    if (!isCompliant) {
      status = ComplianceStatus.NON_COMPLIANT;
    } else if (warnings.length > 0) {
      status = ComplianceStatus.WARNING;
    } else {
      status = ComplianceStatus.COMPLIANT;
    }

    // Calculate remaining hours
    const hoursRemainingToDrive = Math.max(0, this.maxDriveHours - hoursDriven);
    const hoursRemainingOnDuty = Math.max(0, this.maxDutyHours - onDutyTime);

    // Determine if break or rest is required
    const breakRequired = hoursSinceBreak >= this.breakTriggerHours;
    const restRequired =
      hoursDriven >= this.maxDriveHours || onDutyTime >= this.maxDutyHours;

    return {
      status,
      is_compliant: isCompliant,
      checks,
      warnings,
      violations,
      hours_remaining_to_drive: hoursRemainingToDrive,
      hours_remaining_on_duty: hoursRemainingOnDuty,
      break_required: breakRequired,
      rest_required: restRequired,
    };
  }

  private checkDriveLimit(hoursDriven: number): ComplianceCheck {
    const remaining = this.maxDriveHours - hoursDriven;
    const isCompliant = hoursDriven <= this.maxDriveHours;

    let message: string;
    if (isCompliant) {
      if (remaining <= 1.0) {
        message = `Approaching 11-hour drive limit (${remaining.toFixed(1)}h remaining)`;
      } else {
        message = `Within 11-hour drive limit (${remaining.toFixed(1)}h remaining)`;
      }
    } else {
      message = `Exceeded 11-hour drive limit by ${Math.abs(remaining).toFixed(1)}h`;
    }

    return {
      rule_name: '11-hour driving limit',
      is_compliant: isCompliant,
      current_value: hoursDriven,
      limit_value: this.maxDriveHours,
      remaining: Math.max(0, remaining),
      message,
    };
  }

  private checkDutyLimit(onDutyTime: number): ComplianceCheck {
    const remaining = this.maxDutyHours - onDutyTime;
    const isCompliant = onDutyTime <= this.maxDutyHours;

    let message: string;
    if (isCompliant) {
      if (remaining <= 1.0) {
        message = `Approaching 14-hour duty window (${remaining.toFixed(1)}h remaining)`;
      } else {
        message = `Within 14-hour duty window (${remaining.toFixed(1)}h remaining)`;
      }
    } else {
      message = `Exceeded 14-hour duty window by ${Math.abs(remaining).toFixed(1)}h`;
    }

    return {
      rule_name: '14-hour on-duty window',
      is_compliant: isCompliant,
      current_value: onDutyTime,
      limit_value: this.maxDutyHours,
      remaining: Math.max(0, remaining),
      message,
    };
  }

  private checkBreakRequirement(hoursSinceBreak: number): ComplianceCheck {
    const remaining = this.breakTriggerHours - hoursSinceBreak;
    const isCompliant = hoursSinceBreak < this.breakTriggerHours;

    let message: string;
    if (isCompliant) {
      message = `30-minute break not yet required (${remaining.toFixed(1)}h until required)`;
    } else {
      message = `30-minute break required (driven ${hoursSinceBreak.toFixed(1)}h without break)`;
    }

    return {
      rule_name: '30-minute break after 8 hours',
      is_compliant: isCompliant,
      current_value: hoursSinceBreak,
      limit_value: this.breakTriggerHours,
      remaining: Math.max(0, remaining),
      message,
    };
  }

  canDrive(
    hoursDriven: number,
    onDutyTime: number,
    hoursSinceBreak: number,
  ): boolean {
    const result = this.validateCompliance(
      hoursDriven,
      onDutyTime,
      hoursSinceBreak,
    );
    return result.is_compliant && !result.rest_required;
  }

  hoursUntilRestRequired(hoursDriven: number, onDutyTime: number): number {
    const hoursUntilDriveLimit = Math.max(0, this.maxDriveHours - hoursDriven);
    const hoursUntilDutyLimit = Math.max(0, this.maxDutyHours - onDutyTime);
    return Math.min(hoursUntilDriveLimit, hoursUntilDutyLimit);
  }
}
