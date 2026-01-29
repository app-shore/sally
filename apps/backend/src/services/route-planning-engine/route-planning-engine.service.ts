import { Injectable, Logger } from '@nestjs/common';
import { HOSRuleEngineService, HOSState } from '../hos-rule-engine/hos-rule-engine.service';
import { PredictionEngineService } from '../prediction-engine/prediction-engine.service';
import { RestOptimizationService } from '../rest-optimization/rest-optimization.service';
import { RestStopFinderService } from '../rest-stop-finder/rest-stop-finder.service';
import { FuelStopOptimizerService } from '../fuel-stop-optimizer/fuel-stop-optimizer.service';
import { TSPOptimizerService, TSPStop } from '../tsp-optimizer/tsp-optimizer.service';
import { calculateDistanceMatrix, estimateDriveTime } from '../../utils/distance-calculator';

const logger = new Logger('RoutePlanningEngineService');

export interface RouteSegment {
  sequence_order: number;
  segment_type: string;
  from_location: string | null;
  to_location: string | null;
  from_lat: number | null;
  from_lon: number | null;
  to_lat: number | null;
  to_lon: number | null;
  distance_miles: number | null;
  drive_time_hours: number | null;
  rest_type: string | null;
  rest_duration_hours: number | null;
  rest_reason: string | null;
  fuel_gallons: number | null;
  fuel_cost_estimate: number | null;
  fuel_station_name: string | null;
  dock_duration_hours: number | null;
  customer_name: string | null;
  hos_state_after: Record<string, number> | null;
  estimated_arrival: Date | null;
  estimated_departure: Date | null;
}

export interface RouteOptimizationResult {
  optimized_sequence: string[];
  segments: RouteSegment[];
  total_distance_miles: number;
  total_drive_time_hours: number;
  total_on_duty_time_hours: number;
  total_cost_estimate: number;
  rest_stops: Array<{ location: string; type: string; duration_hours: number; reason: string }>;
  fuel_stops: Array<{ location: string; gallons: number; cost: number }>;
  is_feasible: boolean;
  feasibility_issues: string[];
  compliance_report: Record<string, unknown>;
}

export interface RoutePlanInput {
  driver_state: { hours_driven: number; on_duty_time: number; hours_since_break: number };
  vehicle_state: { fuel_capacity_gallons: number; current_fuel_gallons: number; mpg: number };
  stops: Array<{
    stop_id: string;
    name: string;
    lat: number;
    lon: number;
    location_type?: string;
    is_origin?: boolean;
    is_destination?: boolean;
    estimated_dock_hours?: number;
    customer_name?: string;
  }>;
  optimization_priority?: string;
}

@Injectable()
export class RoutePlanningEngineService {
  constructor(
    private readonly hosEngine: HOSRuleEngineService,
    private readonly predictionEngine: PredictionEngineService,
    private readonly restOptimization: RestOptimizationService,
    private readonly restStopFinder: RestStopFinderService,
    private readonly fuelOptimizer: FuelStopOptimizerService,
  ) {}

  planRoute(inputData: RoutePlanInput): RouteOptimizationResult {
    logger.log(`Starting route planning for ${inputData.stops.length} stops`);

    // Step 1: Calculate distance matrix
    const distanceMatrix = calculateDistanceMatrix(inputData.stops);

    // Step 2: Optimize stop sequence with TSP
    const tspStops = this.convertToTspStops(inputData.stops);
    const tspOptimizer = new TSPOptimizerService(distanceMatrix);
    const tspResult = tspOptimizer.optimize(tspStops, inputData.optimization_priority || 'minimize_time');

    logger.log(`TSP optimization complete: ${tspResult.total_distance.toFixed(1)} miles, sequence: ${tspResult.optimized_sequence}`);

    // Step 3: Simulate route segment-by-segment
    const simulationResult = this.simulateRouteExecution(tspResult, inputData, distanceMatrix);

    return {
      optimized_sequence: simulationResult.sequence,
      segments: simulationResult.segments,
      total_distance_miles: simulationResult.total_distance,
      total_drive_time_hours: simulationResult.total_drive_time,
      total_on_duty_time_hours: simulationResult.total_on_duty_time,
      total_cost_estimate: simulationResult.total_cost,
      rest_stops: simulationResult.rest_stops,
      fuel_stops: simulationResult.fuel_stops,
      is_feasible: simulationResult.is_feasible,
      feasibility_issues: simulationResult.feasibility_issues,
      compliance_report: simulationResult.compliance_report,
    };
  }

  private convertToTspStops(stops: RoutePlanInput['stops']): TSPStop[] {
    return stops.map((stop) => ({
      stop_id: stop.stop_id,
      name: stop.name,
      lat: stop.lat,
      lon: stop.lon,
      is_origin: stop.is_origin || false,
      is_destination: stop.is_destination || false,
      earliest_arrival: undefined,
      latest_arrival: undefined,
      estimated_dock_hours: stop.estimated_dock_hours || 0.0,
    }));
  }

  private simulateRouteExecution(
    tspResult: { optimized_sequence: string[]; total_distance: number; route_segments: [string, string, number][] },
    inputData: RoutePlanInput,
    distanceMatrix: Map<string, number>,
  ) {
    const segments: RouteSegment[] = [];
    const restStops: Array<{ location: string; type: string; duration_hours: number; reason: string }> = [];
    const fuelStops: Array<{ location: string; gallons: number; cost: number }> = [];
    const feasibilityIssues: string[] = [];

    // Initialize state
    let currentHos: HOSState = {
      hours_driven: inputData.driver_state.hours_driven,
      on_duty_time: inputData.driver_state.on_duty_time,
      hours_since_break: inputData.driver_state.hours_since_break,
    };

    let currentFuel = inputData.vehicle_state.current_fuel_gallons;
    const fuelCapacity = inputData.vehicle_state.fuel_capacity_gallons;
    const mpg = inputData.vehicle_state.mpg;

    let currentTime = new Date();
    let sequenceOrder = 1;

    // Totals
    let totalDistance = 0.0;
    let totalDriveTime = 0.0;
    let totalOnDutyTime = currentHos.on_duty_time;
    let totalCost = 0.0;

    // Create stop lookup
    const stopLookup = new Map(inputData.stops.map((s) => [s.stop_id, s]));

    // Simulate each segment
    for (let i = 0; i < tspResult.optimized_sequence.length - 1; i++) {
      const fromStopId = tspResult.optimized_sequence[i];
      const toStopId = tspResult.optimized_sequence[i + 1];

      const fromStop = stopLookup.get(fromStopId)!;
      const toStop = stopLookup.get(toStopId)!;

      // Get segment distance and time
      const distance = distanceMatrix.get(`${fromStopId}:${toStopId}`) || 0.0;
      const driveTime = estimateDriveTime(distance, 'highway');

      // Check if HOS allows this segment
      if (currentHos.hours_driven + driveTime > 11) {
        logger.log(`HOS limit reached before ${toStopId}. Inserting rest stop.`);

        const restLocation = this.restStopFinder.findRestStopAlongRoute(fromStop.lat, fromStop.lon, toStop.lat, toStop.lon);

        if (restLocation) {
          const restSegment: RouteSegment = {
            sequence_order: sequenceOrder,
            segment_type: 'rest',
            from_location: null,
            to_location: restLocation.name,
            from_lat: fromStop.lat,
            from_lon: fromStop.lon,
            to_lat: restLocation.lat,
            to_lon: restLocation.lon,
            distance_miles: null,
            drive_time_hours: null,
            rest_type: 'full_rest',
            rest_duration_hours: 10.0,
            rest_reason: 'HOS 11h drive limit reached',
            fuel_gallons: null,
            fuel_cost_estimate: null,
            fuel_station_name: null,
            dock_duration_hours: null,
            customer_name: null,
            hos_state_after: { hours_driven: 0.0, on_duty_time: 0.0, hours_since_break: 0.0 },
            estimated_arrival: currentTime,
            estimated_departure: new Date(currentTime.getTime() + 10 * 60 * 60 * 1000),
          };

          segments.push(restSegment);
          restStops.push({ location: restLocation.name, type: 'full_rest', duration_hours: 10.0, reason: 'HOS 11h drive limit reached' });

          // Reset HOS after rest
          currentHos = { hours_driven: 0.0, on_duty_time: 0.0, hours_since_break: 0.0 };
          currentTime = new Date(currentTime.getTime() + 10 * 60 * 60 * 1000);
          sequenceOrder++;
        } else {
          logger.warn('No rest stop found, route may be infeasible');
          feasibilityIssues.push('HOS limit reached but no rest stop found');
        }
      }

      // Check fuel level
      const fuelNeeded = distance / mpg;
      if (currentFuel < fuelNeeded * 1.2) {
        logger.log(`Fuel low before ${toStopId}. Inserting fuel stop.`);

        const fuelRecommendation = this.fuelOptimizer.optimizeFuelStop(
          fromStop.lat, fromStop.lon, toStop.lat, toStop.lon, currentFuel, fuelCapacity, mpg,
        );

        if (fuelRecommendation.fuel_stop) {
          const fuelSegment: RouteSegment = {
            sequence_order: sequenceOrder,
            segment_type: 'fuel',
            from_location: null,
            to_location: fuelRecommendation.fuel_stop.name,
            from_lat: fromStop.lat,
            from_lon: fromStop.lon,
            to_lat: fuelRecommendation.fuel_stop.lat,
            to_lon: fuelRecommendation.fuel_stop.lon,
            distance_miles: null,
            drive_time_hours: 0.25,
            rest_type: null,
            rest_duration_hours: null,
            rest_reason: null,
            fuel_gallons: fuelRecommendation.gallons_needed,
            fuel_cost_estimate: fuelRecommendation.estimated_cost,
            fuel_station_name: fuelRecommendation.fuel_stop.name,
            dock_duration_hours: null,
            customer_name: null,
            hos_state_after: {
              hours_driven: currentHos.hours_driven,
              on_duty_time: currentHos.on_duty_time + 0.25,
              hours_since_break: currentHos.hours_since_break + 0.25,
            },
            estimated_arrival: currentTime,
            estimated_departure: new Date(currentTime.getTime() + 0.25 * 60 * 60 * 1000),
          };

          segments.push(fuelSegment);
          fuelStops.push({ location: fuelRecommendation.fuel_stop.name, gallons: fuelRecommendation.gallons_needed, cost: fuelRecommendation.estimated_cost });

          currentFuel = fuelCapacity;
          currentHos.on_duty_time += 0.25;
          currentTime = new Date(currentTime.getTime() + 0.25 * 60 * 60 * 1000);
          totalOnDutyTime += 0.25;
          totalCost += fuelRecommendation.estimated_cost;
          sequenceOrder++;
        }
      }

      // Add drive segment
      const driveSegment: RouteSegment = {
        sequence_order: sequenceOrder,
        segment_type: 'drive',
        from_location: fromStop.name,
        to_location: toStop.name,
        from_lat: fromStop.lat,
        from_lon: fromStop.lon,
        to_lat: toStop.lat,
        to_lon: toStop.lon,
        distance_miles: distance,
        drive_time_hours: driveTime,
        rest_type: null,
        rest_duration_hours: null,
        rest_reason: null,
        fuel_gallons: null,
        fuel_cost_estimate: null,
        fuel_station_name: null,
        dock_duration_hours: null,
        customer_name: toStop.customer_name || null,
        hos_state_after: {
          hours_driven: currentHos.hours_driven + driveTime,
          on_duty_time: currentHos.on_duty_time + driveTime,
          hours_since_break: currentHos.hours_since_break + driveTime,
        },
        estimated_arrival: new Date(currentTime.getTime() + driveTime * 60 * 60 * 1000),
        estimated_departure: null,
      };

      segments.push(driveSegment);

      // Update state
      currentHos.hours_driven += driveTime;
      currentHos.on_duty_time += driveTime;
      currentHos.hours_since_break += driveTime;
      currentFuel -= fuelNeeded;
      currentTime = new Date(currentTime.getTime() + driveTime * 60 * 60 * 1000);
      totalDistance += distance;
      totalDriveTime += driveTime;
      totalOnDutyTime += driveTime;
      sequenceOrder++;

      // Add dock segment if stop has dock time
      const dockHours = toStop.estimated_dock_hours || 0;
      if (dockHours > 0) {
        const dockSegment: RouteSegment = {
          sequence_order: sequenceOrder,
          segment_type: 'dock',
          from_location: null,
          to_location: toStop.name,
          from_lat: toStop.lat,
          from_lon: toStop.lon,
          to_lat: null,
          to_lon: null,
          distance_miles: null,
          drive_time_hours: null,
          rest_type: null,
          rest_duration_hours: null,
          rest_reason: null,
          fuel_gallons: null,
          fuel_cost_estimate: null,
          fuel_station_name: null,
          dock_duration_hours: dockHours,
          customer_name: toStop.customer_name || null,
          hos_state_after: {
            hours_driven: currentHos.hours_driven,
            on_duty_time: currentHos.on_duty_time + dockHours,
            hours_since_break: currentHos.hours_since_break + dockHours,
          },
          estimated_arrival: currentTime,
          estimated_departure: new Date(currentTime.getTime() + dockHours * 60 * 60 * 1000),
        };

        segments.push(dockSegment);
        currentHos.on_duty_time += dockHours;
        currentTime = new Date(currentTime.getTime() + dockHours * 60 * 60 * 1000);
        totalOnDutyTime += dockHours;
        sequenceOrder++;
      }
    }

    // Check feasibility
    const isFeasible = feasibilityIssues.length === 0;

    // Compliance report
    const complianceReport = {
      max_drive_hours_used: currentHos.hours_driven,
      max_duty_hours_used: currentHos.on_duty_time,
      breaks_required: Math.floor(currentHos.hours_since_break / 8),
      breaks_planned: segments.filter((s) => s.segment_type === 'rest').length,
      violations: feasibilityIssues,
    };

    return {
      sequence: tspResult.optimized_sequence,
      segments,
      total_distance: totalDistance,
      total_drive_time: totalDriveTime,
      total_on_duty_time: totalOnDutyTime,
      total_cost: totalCost,
      rest_stops: restStops,
      fuel_stops: fuelStops,
      is_feasible: isFeasible,
      feasibility_issues: feasibilityIssues,
      compliance_report: complianceReport,
    };
  }
}
