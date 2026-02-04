import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../config/configuration';
import { HOSRuleEngineService } from '../hos-rule-engine/hos-rule-engine.service';
import { validatePositive } from '../../utils/validators';

const logger = new Logger('RestOptimizationService');

const RestRecommendation = {
  FULL_REST: 'full_rest',
  PARTIAL_REST_7_3: 'partial_rest_7_3',
  PARTIAL_REST_8_2: 'partial_rest_8_2',
  BREAK: 'break',
  NO_REST: 'no_rest',
} as const;

const MIN_DOCK_TIME_FOR_8H_SPLIT = 8.0;
const SLEEPER_BERTH_SPLIT_7_3_LONG = 7.0;
const SLEEPER_BERTH_SPLIT_8_2_LONG = 8.0;

export interface TripRequirement {
  drive_time: number;
  dock_time: number;
  location?: string;
}

export interface RestOptimizationInput {
  hours_driven: number;
  on_duty_time: number;
  hours_since_break: number;
  dock_duration_hours?: number;
  post_load_drive_hours?: number;
  current_location?: string;
  upcoming_trips?: TripRequirement[];
}

export interface FeasibilityAnalysis {
  feasible: boolean;
  limiting_factor: string | null;
  shortfall_hours: number;
  total_drive_needed: number;
  total_on_duty_needed: number;
  will_need_break: boolean;
  drive_margin: number;
  duty_margin: number;
}

export interface OpportunityAnalysis {
  score: number;
  dock_score: number;
  hours_score: number;
  criticality_score: number;
  dock_time_available: number;
  hours_gainable: number;
}

export interface CostAnalysis {
  full_rest_extension_hours: number;
  partial_rest_extension_hours: number;
  dock_time_available: number;
}

export interface RestOptimizationResult {
  recommendation: string;
  recommended_duration_hours: number | null;
  reasoning: string;
  confidence: number;
  is_compliant: boolean;
  compliance_details: string;
  hours_remaining_to_drive: number;
  hours_remaining_on_duty: number;
  post_load_drive_feasible: boolean;
  driver_can_decline: boolean;
  feasibility_analysis: FeasibilityAnalysis | null;
  opportunity_analysis: OpportunityAnalysis | null;
  cost_analysis: CostAnalysis | null;
  hours_after_rest_drive: number | null;
  hours_after_rest_duty: number | null;
}

@Injectable()
export class RestOptimizationService {
  private readonly minRestHours: number;
  private readonly sleeper_berth_split_long: number;
  private readonly sleeper_berth_split_short: number;
  private readonly maxDriveHours: number;
  private readonly maxDutyHours: number;
  private readonly breakTriggerHours: number;
  private readonly requiredBreakMinutes: number;

  constructor(
    private readonly configService: ConfigService<Configuration>,
    private readonly hosEngine: HOSRuleEngineService,
  ) {
    this.minRestHours = this.configService.get<number>('minRestHours', 10.0);
    this.sleeper_berth_split_long = this.configService.get<number>(
      'sleeper_berth_split_long',
      8.0,
    );
    this.sleeper_berth_split_short = this.configService.get<number>(
      'sleeper_berth_split_short',
      2.0,
    );
    this.maxDriveHours = this.configService.get<number>('maxDriveHours', 11.0);
    this.maxDutyHours = this.configService.get<number>('maxDutyHours', 14.0);
    this.breakTriggerHours = this.configService.get<number>(
      'breakTriggerHours',
      8.0,
    );
    this.requiredBreakMinutes = this.configService.get<number>(
      'requiredBreakMinutes',
      30,
    );
  }

  private calculateFeasibility(
    inputData: RestOptimizationInput,
  ): FeasibilityAnalysis {
    // Build trip list
    let trips: TripRequirement[];
    if (inputData.upcoming_trips && inputData.upcoming_trips.length > 0) {
      trips = inputData.upcoming_trips;
    } else if (
      inputData.post_load_drive_hours !== undefined &&
      inputData.post_load_drive_hours !== null
    ) {
      trips = [
        {
          drive_time: inputData.post_load_drive_hours,
          dock_time: inputData.dock_duration_hours || 0,
        },
      ];
    } else {
      return {
        feasible: true,
        limiting_factor: null,
        shortfall_hours: 0,
        total_drive_needed: 0,
        total_on_duty_needed: 0,
        will_need_break: false,
        drive_margin: 999,
        duty_margin: 999,
      };
    }

    // Calculate total requirements
    const totalDriveNeeded = trips.reduce((sum, t) => sum + t.drive_time, 0);
    const totalDockNeeded = trips.reduce((sum, t) => sum + t.dock_time, 0);
    let totalOnDutyNeeded = totalDriveNeeded + totalDockNeeded;

    // Check if break will be required during trips
    const willNeedBreak =
      inputData.hours_since_break + totalDriveNeeded >= this.breakTriggerHours;
    if (willNeedBreak) {
      totalOnDutyNeeded += this.requiredBreakMinutes / 60.0;
    }

    // Calculate current hours remaining
    const driveRemaining = this.maxDriveHours - inputData.hours_driven;
    const dutyRemaining = this.maxDutyHours - inputData.on_duty_time;

    // Calculate shortfalls
    const driveShortfall = Math.max(0, totalDriveNeeded - driveRemaining);
    const dutyShortfall = Math.max(0, totalOnDutyNeeded - dutyRemaining);

    // Determine feasibility and limiting factor
    let limitingFactor: string | null = null;
    let shortfallHours = 0;
    let feasible = true;

    if (driveShortfall > 0 || dutyShortfall > 0) {
      limitingFactor =
        driveShortfall >= dutyShortfall ? 'drive_limit' : 'duty_window';
      shortfallHours = Math.max(driveShortfall, dutyShortfall);
      feasible = false;
    }

    return {
      feasible,
      limiting_factor: limitingFactor,
      shortfall_hours: shortfallHours,
      total_drive_needed: totalDriveNeeded,
      total_on_duty_needed: totalOnDutyNeeded,
      will_need_break: willNeedBreak,
      drive_margin: driveRemaining - totalDriveNeeded,
      duty_margin: dutyRemaining - totalOnDutyNeeded,
    };
  }

  private calculateRestOpportunity(
    inputData: RestOptimizationInput,
  ): OpportunityAnalysis {
    const dockTimeAvailable = inputData.dock_duration_hours || 0;

    // Factor 1: Dock Time Availability (0-30 points)
    let dockScore: number;
    if (dockTimeAvailable >= this.minRestHours) {
      dockScore = 30;
    } else if (dockTimeAvailable >= this.sleeper_berth_split_long) {
      dockScore = 20;
    } else if (dockTimeAvailable >= 2) {
      dockScore = 10;
    } else {
      dockScore = 0;
    }

    // Factor 2: Hours Gainable (0-30 points)
    let hoursGainable = 0;
    let hoursScore = 0;
    if (dockTimeAvailable >= this.minRestHours || dockTimeAvailable >= 2) {
      const driveRemaining = this.maxDriveHours - inputData.hours_driven;
      const dutyRemaining = this.maxDutyHours - inputData.on_duty_time;
      const driveGainable = this.maxDriveHours - driveRemaining;
      const dutyGainable = this.maxDutyHours - dutyRemaining;
      hoursGainable = Math.max(driveGainable, dutyGainable);
      hoursScore = Math.min(30, (hoursGainable / this.maxDriveHours) * 30);
    }

    // Factor 3: Current Hours Criticality (0-40 points)
    const driveUtilization = inputData.hours_driven / this.maxDriveHours;
    const dutyUtilization = inputData.on_duty_time / this.maxDutyHours;
    const maxUtilization = Math.max(driveUtilization, dutyUtilization);

    let criticalityScore: number;
    if (maxUtilization >= 0.9) {
      criticalityScore = 40;
    } else if (maxUtilization >= 0.75) {
      criticalityScore = 30;
    } else if (maxUtilization >= 0.5) {
      criticalityScore = 15;
    } else {
      criticalityScore = 5;
    }

    const opportunityScore = dockScore + hoursScore + criticalityScore;

    return {
      score: opportunityScore,
      dock_score: dockScore,
      hours_score: hoursScore,
      criticality_score: criticalityScore,
      dock_time_available: dockTimeAvailable,
      hours_gainable: hoursGainable,
    };
  }

  private calculateRestCost(inputData: RestOptimizationInput): CostAnalysis {
    const dockTimeAvailable = inputData.dock_duration_hours || 0;

    // Cost for full rest (10 hours)
    const fullRestExtension =
      dockTimeAvailable >= this.minRestHours
        ? 0
        : this.minRestHours - dockTimeAvailable;

    // Cost for partial rest (7 hours)
    const partialRestExtension =
      dockTimeAvailable >= this.sleeper_berth_split_long
        ? 0
        : this.sleeper_berth_split_long - dockTimeAvailable;

    return {
      full_rest_extension_hours: fullRestExtension,
      partial_rest_extension_hours: partialRestExtension,
      dock_time_available: dockTimeAvailable,
    };
  }

  private optimizeRestDecision(
    inputData: RestOptimizationInput,
    feasibility: FeasibilityAnalysis,
    opportunity: OpportunityAnalysis,
    cost: CostAnalysis,
  ): [string, number | null, string, number, boolean] {
    // PRIORITY 1: MANDATORY REST (Compliance Issue)
    if (!feasibility.feasible) {
      if (cost.dock_time_available >= 2) {
        return [
          RestRecommendation.FULL_REST,
          this.minRestHours,
          `Trip not feasible with current hours. ` +
            `Shortfall: ${feasibility.shortfall_hours.toFixed(1)}h (${feasibility.limiting_factor}). ` +
            `Extending dock time (${cost.dock_time_available.toFixed(1)}h) to full ${this.minRestHours.toFixed(0)}h rest ` +
            `will reset all hours and enable trip completion.`,
          100,
          false,
        ];
      } else {
        return [
          RestRecommendation.FULL_REST,
          this.minRestHours,
          `Trip not feasible. Must take full ${this.minRestHours.toFixed(0)}h rest. ` +
            `Dock time (${cost.dock_time_available.toFixed(1)}h) too short to leverage.`,
          100,
          false,
        ];
      }
    }

    // PRIORITY 2: BREAK REQUIREMENT OVERRIDE
    if (inputData.hours_since_break >= this.breakTriggerHours) {
      return [
        RestRecommendation.NO_REST,
        this.requiredBreakMinutes / 60.0,
        `30-minute break required (driven ${inputData.hours_since_break.toFixed(1)}h without break). ` +
          `Take off-duty break during dock time before continuing.`,
        100,
        false,
      ];
    }

    // PRIORITY 3: FEASIBLE BUT MARGINAL (Risk Management)
    if (feasibility.drive_margin < 2 || feasibility.duty_margin < 2) {
      if (opportunity.score >= 50 && cost.full_rest_extension_hours <= 5) {
        return [
          RestRecommendation.FULL_REST,
          this.minRestHours,
          `Trip feasible but marginal (margin: ${feasibility.drive_margin.toFixed(1)}h drive, ` +
            `${feasibility.duty_margin.toFixed(1)}h duty). ` +
            `Opportunity score: ${opportunity.score.toFixed(0)}/100. ` +
            `Extending rest by ${cost.full_rest_extension_hours.toFixed(1)}h provides ` +
            `${opportunity.hours_gainable.toFixed(1)}h gain and better safety margin.`,
          75,
          true,
        ];
      } else if (
        opportunity.score >= 40 &&
        cost.partial_rest_extension_hours <= 3
      ) {
        if (cost.dock_time_available >= MIN_DOCK_TIME_FOR_8H_SPLIT) {
          return [
            RestRecommendation.PARTIAL_REST_8_2,
            SLEEPER_BERTH_SPLIT_8_2_LONG,
            `Trip marginal. Consider 8-hour partial rest (8/2 split). ` +
              `Extension needed: ${Math.max(0, SLEEPER_BERTH_SPLIT_8_2_LONG - cost.dock_time_available).toFixed(1)}h. ` +
              `Provides better recovery than 7/3 split while preserving schedule.`,
            65,
            true,
          ];
        } else {
          return [
            RestRecommendation.PARTIAL_REST_7_3,
            SLEEPER_BERTH_SPLIT_7_3_LONG,
            `Trip marginal. Consider 7-hour partial rest (7/3 split). ` +
              `Extension needed: ${cost.partial_rest_extension_hours.toFixed(1)}h. ` +
              `Provides some recovery while preserving schedule.`,
            65,
            true,
          ];
        }
      } else {
        return [
          RestRecommendation.NO_REST,
          null,
          `Trip feasible but with tight margins (drive: ${feasibility.drive_margin.toFixed(1)}h, ` +
            `duty: ${feasibility.duty_margin.toFixed(1)}h). ` +
            `Monitor closely. Plan for rest after delivery.`,
          60,
          true,
        ];
      }
    }

    // PRIORITY 4: FEASIBLE WITH GOOD MARGIN (Optimization)
    if (feasibility.drive_margin >= 2 && feasibility.duty_margin >= 2) {
      if (opportunity.score >= 60 && cost.full_rest_extension_hours <= 5) {
        return [
          RestRecommendation.FULL_REST,
          this.minRestHours,
          `Trip easily feasible. However, dock time (${cost.dock_time_available.toFixed(1)}h) ` +
            `presents good rest opportunity (score: ${opportunity.score.toFixed(0)}/100). ` +
            `Extending by ${cost.full_rest_extension_hours.toFixed(1)}h would gain ` +
            `${opportunity.hours_gainable.toFixed(1)}h for next shift. Optional optimization.`,
          55,
          true,
        ];
      } else {
        return [
          RestRecommendation.NO_REST,
          null,
          `Trip easily feasible with ${feasibility.drive_margin.toFixed(1)}h drive margin ` +
            `and ${feasibility.duty_margin.toFixed(1)}h duty margin. ` +
            `No rest needed. Continue as planned.`,
          80,
          true,
        ];
      }
    }

    // Fallback (should not reach here)
    return [
      RestRecommendation.NO_REST,
      null,
      'Continuing with current plan.',
      70,
      true,
    ];
  }

  recommendRest(inputData: RestOptimizationInput): RestOptimizationResult {
    // Validate inputs
    validatePositive(inputData.hours_driven, 'hours_driven');
    validatePositive(inputData.on_duty_time, 'on_duty_time');
    validatePositive(inputData.hours_since_break, 'hours_since_break');
    if (
      inputData.dock_duration_hours !== undefined &&
      inputData.dock_duration_hours !== null
    ) {
      validatePositive(inputData.dock_duration_hours, 'dock_duration_hours');
    }
    if (
      inputData.post_load_drive_hours !== undefined &&
      inputData.post_load_drive_hours !== null
    ) {
      validatePositive(
        inputData.post_load_drive_hours,
        'post_load_drive_hours',
      );
    }

    // Step 1: Check HOS compliance
    const complianceResult = this.hosEngine.validateCompliance(
      inputData.hours_driven,
      inputData.on_duty_time,
      inputData.hours_since_break,
    );

    // Step 2: Run intelligent optimization formula
    const feasibility = this.calculateFeasibility(inputData);
    const opportunity = this.calculateRestOpportunity(inputData);
    const cost = this.calculateRestCost(inputData);

    const [recommendation, duration, reasoning, confidence, driverCanDecline] =
      this.optimizeRestDecision(inputData, feasibility, opportunity, cost);

    // Step 3: Calculate hours after rest
    let hoursAfterRestDrive: number;
    let hoursAfterRestDuty: number;

    if (recommendation === RestRecommendation.FULL_REST) {
      hoursAfterRestDrive = this.maxDriveHours;
      hoursAfterRestDuty = this.maxDutyHours;
    } else if (
      recommendation === RestRecommendation.PARTIAL_REST_7_3 ||
      recommendation === RestRecommendation.PARTIAL_REST_8_2
    ) {
      hoursAfterRestDrive =
        complianceResult.hours_remaining_to_drive + (duration || 0) * 0.5;
      hoursAfterRestDuty =
        complianceResult.hours_remaining_on_duty + (duration || 0) * 0.5;
    } else {
      hoursAfterRestDrive = complianceResult.hours_remaining_to_drive;
      hoursAfterRestDuty = complianceResult.hours_remaining_on_duty;
    }

    // Step 4: Check if post-load drive is feasible
    const postLoadFeasible =
      feasibility.feasible || recommendation === RestRecommendation.FULL_REST;

    // Compile compliance details
    const complianceDetails = complianceResult.checks
      .map((check) => check.message)
      .join('; ');

    return {
      recommendation,
      recommended_duration_hours: duration,
      reasoning,
      confidence,
      is_compliant: complianceResult.is_compliant,
      compliance_details: complianceDetails,
      hours_remaining_to_drive: complianceResult.hours_remaining_to_drive,
      hours_remaining_on_duty: complianceResult.hours_remaining_on_duty,
      post_load_drive_feasible: postLoadFeasible,
      driver_can_decline: driverCanDecline,
      feasibility_analysis: feasibility,
      opportunity_analysis: opportunity,
      cost_analysis: cost,
      hours_after_rest_drive: hoursAfterRestDrive,
      hours_after_rest_duty: hoursAfterRestDuty,
    };
  }
}
