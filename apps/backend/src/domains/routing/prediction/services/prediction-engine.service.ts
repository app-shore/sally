import { Injectable, Logger } from '@nestjs/common';
import { validatePositive } from '../../../../shared/utils/validators';

const logger = new Logger('PredictionEngineService');

export interface PredictionInput {
  remaining_distance_miles: number;
  destination: string;
  appointment_time?: string;
  current_location?: string;
  average_speed_mph: number;
}

export interface PredictionResult {
  estimated_drive_hours: number;
  estimated_arrival_time: string | null;
  is_high_demand: boolean;
  is_low_demand: boolean;
  confidence: number;
  reasoning: string;
}

@Injectable()
export class PredictionEngineService {
  private static readonly LOW_DEMAND_THRESHOLD_HOURS = 3.0;
  private static readonly HIGH_DEMAND_THRESHOLD_HOURS = 8.0;
  private readonly defaultAverageSpeed = 55.0;

  predictDriveDemand(inputData: PredictionInput): PredictionResult {
    validatePositive(
      inputData.remaining_distance_miles,
      'remaining_distance_miles',
    );
    validatePositive(inputData.average_speed_mph, 'average_speed_mph');

    // Calculate estimated drive hours
    const estimatedDriveHours =
      inputData.remaining_distance_miles / inputData.average_speed_mph;

    // Estimate arrival time
    let estimatedArrivalTime: string | null = null;
    if (inputData.appointment_time) {
      estimatedArrivalTime = inputData.appointment_time;
    } else {
      const now = new Date();
      const arrival = new Date(
        now.getTime() + estimatedDriveHours * 60 * 60 * 1000,
      );
      estimatedArrivalTime = arrival.toISOString();
    }

    // Classify demand
    const isLowDemand =
      estimatedDriveHours <= PredictionEngineService.LOW_DEMAND_THRESHOLD_HOURS;
    const isHighDemand =
      estimatedDriveHours >=
      PredictionEngineService.HIGH_DEMAND_THRESHOLD_HOURS;

    // Generate reasoning
    const reasoning = this.generateReasoning(
      estimatedDriveHours,
      inputData.remaining_distance_miles,
      isLowDemand,
      isHighDemand,
    );

    // Confidence is 0.7 for MVP
    const confidence = 0.7;

    return {
      estimated_drive_hours: Math.round(estimatedDriveHours * 100) / 100,
      estimated_arrival_time: estimatedArrivalTime,
      is_high_demand: isHighDemand,
      is_low_demand: isLowDemand,
      confidence,
      reasoning,
    };
  }

  private generateReasoning(
    estimatedHours: number,
    distanceMiles: number,
    isLowDemand: boolean,
    isHighDemand: boolean,
  ): string {
    const baseText = `Estimated ${estimatedHours.toFixed(1)} hours of driving to cover ${distanceMiles.toFixed(1)} miles. `;

    if (isLowDemand) {
      return (
        baseText +
        `This is considered LOW demand (< ${PredictionEngineService.LOW_DEMAND_THRESHOLD_HOURS}h), making it favorable for taking rest during dock time.`
      );
    } else if (isHighDemand) {
      return (
        baseText +
        `This is considered HIGH demand (> ${PredictionEngineService.HIGH_DEMAND_THRESHOLD_HOURS}h), requiring careful rest planning to ensure sufficient hours available.`
      );
    } else {
      return (
        baseText +
        'This is considered MODERATE demand, requiring balanced rest and driving strategy.'
      );
    }
  }

  estimateDriveHoursSimple(distanceMiles: number, avgSpeedMph = 55.0): number {
    validatePositive(distanceMiles, 'distance_miles');
    validatePositive(avgSpeedMph, 'avg_speed_mph');
    return distanceMiles / avgSpeedMph;
  }

  estimateDockTime(locationType: string): number {
    const dockTimes: Record<string, number> = {
      warehouse: 2.0,
      customer: 1.0,
      distribution_center: 3.0,
      truck_stop: 0.0,
      service_area: 0.0,
      fuel_station: 0.25,
    };
    return dockTimes[locationType] ?? 1.5;
  }

  estimateFuelConsumption(distanceMiles: number, mpg = 6.0): number {
    validatePositive(distanceMiles, 'distance_miles');
    validatePositive(mpg, 'mpg');
    return distanceMiles / mpg;
  }
}
