import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../../../config/configuration';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface HOSState {
  hoursDriven: number;
  onDutyTime: number;
  hoursSinceBreak: number;
  cycleHoursUsed: number;
  cycleDaysData: Array<{ date: string; hoursWorked: number }>;
  splitRestState?: {
    inSplit: boolean;
    firstPortionType:
      | 'sleeper_7'
      | 'sleeper_8'
      | 'offduty_2'
      | 'offduty_3'
      | null;
    firstPortionCompleted: boolean;
    pausedDutyWindow: number;
  };
}

export interface ComplianceCheck {
  rule: string;
  limit: number;
  current: number;
  remaining: number;
  isCompliant: boolean;
  warningLevel: 'ok' | 'warning' | 'critical' | 'violation';
}

export interface HOSComplianceResult {
  isCompliant: boolean;
  checks: ComplianceCheck[];
  hoursAvailableToDrive: number;
  hoursUntilBreakRequired: number;
  needsRestart: boolean;
  cycleHoursRemaining: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class HOSRuleEngineService {
  private readonly logger = new Logger(HOSRuleEngineService.name);

  private readonly maxDriveHours: number;
  private readonly maxDutyHours: number;
  private readonly requiredBreakMinutes: number;
  private readonly breakTriggerHours: number;
  private readonly minRestHours: number;
  private readonly sleeperBerthSplitLong: number;
  private readonly sleeperBerthSplitShort: number;
  private readonly maxCycleHours: number;
  private readonly cycleDays: number;
  private readonly restartHours: number;

  constructor(
    private readonly configService: ConfigService<Configuration, true>,
  ) {
    this.maxDriveHours = this.configService.get('maxDriveHours', {
      infer: true,
    });
    this.maxDutyHours = this.configService.get('maxDutyHours', {
      infer: true,
    });
    this.requiredBreakMinutes = this.configService.get('requiredBreakMinutes', {
      infer: true,
    });
    this.breakTriggerHours = this.configService.get('breakTriggerHours', {
      infer: true,
    });
    this.minRestHours = this.configService.get('minRestHours', {
      infer: true,
    });
    this.sleeperBerthSplitLong = this.configService.get(
      'sleeper_berth_split_long',
      { infer: true },
    );
    this.sleeperBerthSplitShort = this.configService.get(
      'sleeper_berth_split_short',
      { infer: true },
    );
    this.maxCycleHours = this.configService.get('maxCycleHours', {
      infer: true,
    });
    this.cycleDays = this.configService.get('cycleDays', { infer: true });
    this.restartHours = this.configService.get('restartHours', {
      infer: true,
    });

    this.logger.log(
      `HOS Rule Engine initialized: ${this.maxDriveHours}h drive / ` +
        `${this.maxDutyHours}h duty / ${this.maxCycleHours}h cycle over ` +
        `${this.cycleDays} days / ${this.restartHours}h restart`,
    );
  }

  // ─── Public Methods ──────────────────────────────────────────────────────

  /**
   * Validates full HOS compliance for the given state.
   * Returns detailed results for every rule (drive, duty, break, cycle).
   */
  validateCompliance(state: HOSState): HOSComplianceResult {
    const checks: ComplianceCheck[] = [
      this.checkDriveLimit(state),
      this.checkDutyLimit(state),
      this.checkBreakRequirement(state),
      this.checkCycleLimit(state),
    ];

    const isCompliant = checks.every((c) => c.isCompliant);

    const driveCheck = checks[0];
    const dutyCheck = checks[1];
    const breakCheck = checks[2];
    const cycleCheck = checks[3];

    // Hours available to drive is the minimum of all remaining allowances
    const hoursAvailableToDrive = Math.max(
      0,
      Math.min(driveCheck.remaining, dutyCheck.remaining, cycleCheck.remaining),
    );

    const hoursUntilBreakRequired = Math.max(0, breakCheck.remaining);

    // A 34-hour restart is needed when cycle hours are exhausted or nearly so
    const needsRestart = cycleCheck.remaining <= 0;

    const cycleHoursRemaining = Math.max(0, cycleCheck.remaining);

    return {
      isCompliant,
      checks,
      hoursAvailableToDrive,
      hoursUntilBreakRequired,
      needsRestart,
      cycleHoursRemaining,
    };
  }

  /**
   * Quick boolean: can the driver legally drive right now?
   */
  canDrive(state: HOSState): boolean {
    return (
      state.hoursDriven < this.maxDriveHours &&
      state.onDutyTime < this.maxDutyHours &&
      state.hoursSinceBreak < this.breakTriggerHours &&
      state.cycleHoursUsed < this.maxCycleHours
    );
  }

  /**
   * Returns the minimum hours until any rest/break is required.
   * This accounts for the 11-hour drive limit, 14-hour duty window,
   * 8-hour break trigger, and 70-hour cycle limit.
   */
  hoursUntilRestRequired(state: HOSState): number {
    const driveRemaining = Math.max(0, this.maxDriveHours - state.hoursDriven);
    const dutyRemaining = Math.max(0, this.maxDutyHours - state.onDutyTime);
    const breakRemaining = Math.max(
      0,
      this.breakTriggerHours - state.hoursSinceBreak,
    );
    const cycleRemaining = Math.max(
      0,
      this.maxCycleHours - state.cycleHoursUsed,
    );

    return Math.min(
      driveRemaining,
      dutyRemaining,
      breakRemaining,
      cycleRemaining,
    );
  }

  /**
   * Returns a new HOSState reflecting what the state would be after driving
   * the given number of hours (driveHours is a subset of onDutyHours).
   *
   * Note: onDutyHours includes driveHours plus any other on-duty time
   * (e.g., loading, fueling). If onDutyHours < driveHours it is clamped.
   */
  simulateAfterDriving(
    state: HOSState,
    driveHours: number,
    onDutyHours: number,
  ): HOSState {
    const effectiveOnDuty = Math.max(driveHours, onDutyHours);

    return {
      ...state,
      hoursDriven: state.hoursDriven + driveHours,
      onDutyTime: state.onDutyTime + effectiveOnDuty,
      hoursSinceBreak: state.hoursSinceBreak + effectiveOnDuty,
      cycleHoursUsed: state.cycleHoursUsed + effectiveOnDuty,
      cycleDaysData: this.updateCycleDaysData(
        state.cycleDaysData,
        effectiveOnDuty,
      ),
      splitRestState: state.splitRestState
        ? { ...state.splitRestState }
        : undefined,
    };
  }

  /**
   * Simulates a full 10-hour off-duty rest period.
   * Resets the daily clocks (drive, duty, break) but does NOT reset the
   * 70-hour/8-day cycle. The rest hours are not added to cycle on-duty totals
   * because the driver is off-duty during rest.
   */
  simulateAfterFullRest(state: HOSState): HOSState {
    return {
      hoursDriven: 0,
      onDutyTime: 0,
      hoursSinceBreak: 0,
      cycleHoursUsed: state.cycleHoursUsed, // cycle is NOT reset
      cycleDaysData: [...state.cycleDaysData],
      splitRestState: undefined, // clear any split rest in progress
    };
  }

  /**
   * Simulates a 34-hour restart. Resets EVERYTHING including the 70-hour
   * cycle. The cycleDaysData is cleared since the driver starts fresh.
   */
  simulateAfter34hRestart(state: HOSState): HOSState {
    return {
      hoursDriven: 0,
      onDutyTime: 0,
      hoursSinceBreak: 0,
      cycleHoursUsed: 0,
      cycleDaysData: [],
      splitRestState: undefined,
    };
  }

  /**
   * Handles the split sleeper-berth provision.
   *
   * Split types:
   *   '7_3' => 7-hour sleeper + 3-hour off-duty/sleeper (totaling 10)
   *   '8_2' => 8-hour sleeper + 2-hour off-duty/sleeper (totaling 10)
   *
   * Portion 'first' starts the split; 'second' completes it.
   *
   * The key rule: neither portion counts against the 14-hour duty window.
   * After the second portion, the daily clocks are effectively reset (as if
   * a full 10-hour rest was taken) because the combined split equals 10h.
   */
  simulateAfterSplitRest(
    state: HOSState,
    splitType: '7_3' | '8_2',
    portion: 'first' | 'second',
  ): HOSState {
    if (portion === 'first') {
      const firstPortionType = splitType === '7_3' ? 'sleeper_7' : 'sleeper_8';

      return {
        ...state,
        // The duty window is paused (not reset) during the first portion
        splitRestState: {
          inSplit: true,
          firstPortionType,
          firstPortionCompleted: true,
          pausedDutyWindow: state.onDutyTime,
        },
        // Break clock resets after a qualifying sleeper period
        hoursSinceBreak: 0,
      };
    }

    // Second portion: complete the split
    // After both portions are done the driver gets a fresh daily window
    // but the cycle is NOT reset
    return {
      hoursDriven: 0,
      onDutyTime: 0,
      hoursSinceBreak: 0,
      cycleHoursUsed: state.cycleHoursUsed,
      cycleDaysData: [...state.cycleDaysData],
      splitRestState: undefined,
    };
  }

  /**
   * Checks whether the driver would need a 34-hour restart if they were to
   * drive the given additional hours. Returns true if the cycle limit would
   * be exceeded.
   */
  needsRestart(state: HOSState, additionalDriveHours: number): boolean {
    return state.cycleHoursUsed + additionalDriveHours > this.maxCycleHours;
  }

  /**
   * Creates a fresh initial HOS state with all counters at zero.
   */
  createInitialState(): HOSState {
    return {
      hoursDriven: 0,
      onDutyTime: 0,
      hoursSinceBreak: 0,
      cycleHoursUsed: 0,
      cycleDaysData: [],
      splitRestState: undefined,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private checkDriveLimit(state: HOSState): ComplianceCheck {
    const remaining = Math.max(0, this.maxDriveHours - state.hoursDriven);
    const isCompliant = state.hoursDriven <= this.maxDriveHours;

    return {
      rule: '11-hour driving limit',
      limit: this.maxDriveHours,
      current: state.hoursDriven,
      remaining,
      isCompliant,
      warningLevel: this.getWarningLevel(state.hoursDriven, this.maxDriveHours),
    };
  }

  private checkDutyLimit(state: HOSState): ComplianceCheck {
    const remaining = Math.max(0, this.maxDutyHours - state.onDutyTime);
    const isCompliant = state.onDutyTime <= this.maxDutyHours;

    return {
      rule: '14-hour duty window',
      limit: this.maxDutyHours,
      current: state.onDutyTime,
      remaining,
      isCompliant,
      warningLevel: this.getWarningLevel(state.onDutyTime, this.maxDutyHours),
    };
  }

  private checkBreakRequirement(state: HOSState): ComplianceCheck {
    const remaining = Math.max(
      0,
      this.breakTriggerHours - state.hoursSinceBreak,
    );
    const isCompliant = state.hoursSinceBreak <= this.breakTriggerHours;

    return {
      rule: `30-minute break required after ${this.breakTriggerHours} hours`,
      limit: this.breakTriggerHours,
      current: state.hoursSinceBreak,
      remaining,
      isCompliant,
      warningLevel: this.getWarningLevel(
        state.hoursSinceBreak,
        this.breakTriggerHours,
      ),
    };
  }

  private checkCycleLimit(state: HOSState): ComplianceCheck {
    const remaining = Math.max(0, this.maxCycleHours - state.cycleHoursUsed);
    const isCompliant = state.cycleHoursUsed <= this.maxCycleHours;

    return {
      rule: `${this.maxCycleHours}-hour/${this.cycleDays}-day cycle limit`,
      limit: this.maxCycleHours,
      current: state.cycleHoursUsed,
      remaining,
      isCompliant,
      warningLevel: this.getWarningLevel(
        state.cycleHoursUsed,
        this.maxCycleHours,
      ),
    };
  }

  /**
   * Determines the warning level based on how close current usage is to
   * the limit.
   *
   * Thresholds:
   *   ok        < 75% of limit
   *   warning   75% - 90% of limit
   *   critical  90% - 100% of limit
   *   violation >= 100% of limit
   */
  private getWarningLevel(
    current: number,
    limit: number,
  ): 'ok' | 'warning' | 'critical' | 'violation' {
    if (limit <= 0) {
      return current > 0 ? 'violation' : 'ok';
    }

    const ratio = current / limit;

    if (ratio >= 1.0) {
      return 'violation';
    }
    if (ratio >= 0.9) {
      return 'critical';
    }
    if (ratio >= 0.75) {
      return 'warning';
    }
    return 'ok';
  }

  /**
   * Updates the cycleDaysData array to reflect additional on-duty hours
   * for the current day. If today already has an entry, the hours are added.
   * Otherwise, a new entry is pushed and the oldest is popped if the array
   * exceeds the configured cycleDays window.
   */
  private updateCycleDaysData(
    existingData: Array<{ date: string; hoursWorked: number }>,
    additionalHours: number,
  ): Array<{ date: string; hoursWorked: number }> {
    const data = existingData.map((d) => ({ ...d }));
    const today = new Date().toISOString().split('T')[0];

    const todayEntry = data.find((d) => d.date === today);
    if (todayEntry) {
      todayEntry.hoursWorked += additionalHours;
    } else {
      data.push({ date: today, hoursWorked: additionalHours });
    }

    // Keep only the most recent cycleDays entries
    while (data.length > this.cycleDays) {
      data.shift();
    }

    return data;
  }
}
