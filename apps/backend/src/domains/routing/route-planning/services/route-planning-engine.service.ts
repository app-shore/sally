import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../../../config/configuration';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ROUTING_PROVIDER,
  RoutingProvider,
  LatLon,
  DistanceMatrix,
} from '../../providers/routing/routing-provider.interface';
import {
  WEATHER_PROVIDER,
  WeatherProvider,
  WeatherAlert,
} from '../../providers/weather/weather-provider.interface';
import {
  FUEL_DATA_PROVIDER,
  FuelDataProvider,
} from '../../providers/fuel/fuel-data-provider.interface';
import {
  HOSRuleEngineService,
  HOSState,
} from '../../hos-compliance/services/hos-rule-engine.service';
import {
  RoutePlanPersistenceService,
  CreateSegmentData,
  CreatePlanData,
} from './route-plan-persistence.service';

// ─── Request / Response Types ────────────────────────────────────────────────

export interface RoutePlanRequest {
  driverId: string; // Driver.driverId (string identifier)
  vehicleId: string; // Vehicle.vehicleId (string identifier)
  loadIds: string[]; // Load.loadId[] (string identifiers)
  departureTime: Date;
  tenantId: number;
  optimizationPriority?: 'minimize_time' | 'minimize_cost' | 'balance';
  dispatcherParams?: {
    dockRestStops?: Array<{
      stopId: string;
      truckParkedHours: number;
      convertToRest: boolean;
    }>;
    preferredRestType?: 'auto' | 'full' | 'split_8_2' | 'split_7_3';
    avoidTollRoads?: boolean;
    maxDetourMilesForFuel?: number;
  };
}

export interface RoutePlanResult {
  planId: string;
  status: string;
  isFeasible: boolean;
  feasibilityIssues: string[];
  totalDistanceMiles: number;
  totalDriveTimeHours: number;
  totalTripTimeHours: number;
  totalDrivingDays: number;
  totalCostEstimate: number;
  departureTime: Date;
  estimatedArrival: Date;
  segments: SegmentResult[];
  complianceReport: ComplianceReport;
  weatherAlerts: WeatherAlert[];
  dailyBreakdown: DayBreakdown[];
}

export interface SegmentResult {
  segmentId: string;
  sequenceOrder: number;
  segmentType: 'drive' | 'rest' | 'fuel' | 'dock' | 'break';
  fromLocation: string;
  toLocation: string;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  distanceMiles?: number;
  driveTimeHours?: number;
  restDurationHours?: number;
  restType?: string;
  restReason?: string;
  dockDurationHours?: number;
  customerName?: string;
  fuelGallons?: number;
  fuelCostEstimate?: number;
  fuelStationName?: string;
  fuelPricePerGallon?: number;
  detourMiles?: number;
  isDocktimeConverted?: boolean;
  estimatedArrival: Date;
  estimatedDeparture: Date;
  hosStateAfter: HOSState;
  weatherAlerts?: WeatherAlert[];
  routeGeometry?: string;
  timezone?: string;
}

interface ComplianceReport {
  isFullyCompliant: boolean;
  totalRestStops: number;
  totalBreaks: number;
  total34hRestarts: number;
  totalSplitRests: number;
  dockTimeConversions: number;
  rules: Array<{ rule: string; status: 'pass' | 'addressed' }>;
}

interface DayBreakdown {
  day: number;
  date: string;
  driveHours: number;
  onDutyHours: number;
  segments: number;
  restStops: number;
}

// ─── Internal Simulation Types ───────────────────────────────────────────────

interface ResolvedStop {
  id: number;
  stopId: string;
  name: string;
  lat: number;
  lon: number;
  type: 'pickup' | 'delivery' | 'fuel' | 'rest' | 'origin';
  timezone?: string;
  appointmentWindow?: { start: Date; end: Date };
  dockDurationHours?: number;
  customerName?: string;
  loadId?: string;
}

interface SimulationState {
  currentTime: Date;
  hosState: HOSState;
  fuelRemainingGallons: number;
  currentLat: number;
  currentLon: number;
  currentLocation: string;
  segments: SegmentResult[];
  segmentCounter: number;
  dayCounter: number;
  dailyBreakdown: DayBreakdown[];
  weatherAlerts: WeatherAlert[];
  feasibilityIssues: string[];
  totalDistanceMiles: number;
  totalDriveTimeHours: number;
  totalCostEstimate: number;
}

type RestDecision =
  | { type: 'none' }
  | { type: 'break_30min' }
  | { type: 'full_rest'; hours: number }
  | { type: 'split_first'; splitType: '7_3' | '8_2'; hours: number }
  | { type: 'split_second'; splitType: '7_3' | '8_2'; hours: number }
  | { type: 'restart_34h' };

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_FUEL_TANK_GALLONS = 300; // typical class 8 truck dual tanks
const DEFAULT_MPG = 6.5;
const FUEL_RESERVE_GALLONS = 50; // don't run below this
const DEFAULT_FUEL_COST_PER_GALLON = 3.8;
const FUELING_TIME_HOURS = 0.5; // 30 min to fuel
const BREAK_DURATION_HOURS = 0.5; // 30-min mandatory break
const DOCK_DEFAULT_HOURS = 2; // default dock time if not specified
const MAX_SIMULATION_SEGMENTS = 200; // safety limit

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class RoutePlanningEngineService {
  private readonly logger = new Logger(RoutePlanningEngineService.name);
  private readonly minRestHours: number;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ROUTING_PROVIDER)
    private readonly routingProvider: RoutingProvider,
    @Inject(WEATHER_PROVIDER)
    private readonly weatherProvider: WeatherProvider,
    @Inject(FUEL_DATA_PROVIDER)
    private readonly fuelProvider: FuelDataProvider,
    private readonly hosEngine: HOSRuleEngineService,
    private readonly persistenceService: RoutePlanPersistenceService,
    private readonly configService: ConfigService<Configuration>,
  ) {
    this.minRestHours = this.configService.get('minRestHours', {
      infer: true,
    });
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  async planRoute(input: RoutePlanRequest): Promise<RoutePlanResult> {
    this.logger.log(
      `Planning route: driver=${input.driverId}, vehicle=${input.vehicleId}, ` +
        `loads=${input.loadIds.length}, departure=${input.departureTime.toISOString()}`,
    );

    // Step 1: Resolve all entities from DB
    const driver = await this.resolveDriver(input.driverId, input.tenantId);
    const vehicle = await this.resolveVehicle(input.vehicleId, input.tenantId);
    const stops = await this.resolveLoadStops(input.loadIds, input.tenantId);

    if (stops.length === 0) {
      throw new BadRequestException('No stops found for the provided load IDs');
    }

    // Step 2: Build location list for distance matrix
    // Driver doesn't have lat/lon fields yet; use first stop as origin
    const originStop: ResolvedStop = {
      id: 0,
      stopId: 'origin',
      name: driver.name + ' (Start)',
      lat: stops[0].lat,
      lon: stops[0].lon,
      type: 'origin',
      timezone: driver.homeTerminalTimezone ?? 'America/New_York',
    };

    const allStops = [originStop, ...stops];
    const latLons: LatLon[] = allStops.map((s) => ({
      lat: s.lat,
      lon: s.lon,
      id: s.stopId,
    }));

    // Step 3: Get road distances
    const distanceMatrix =
      await this.routingProvider.getDistanceMatrix(latLons);

    // Step 4: Optimize stop sequence (TSP with time windows)
    const optimizedStops = this.optimizeStopSequence(allStops, distanceMatrix);

    // Step 5: Simulate route segment-by-segment
    const simulation = await this.simulateRoute(
      optimizedStops,
      distanceMatrix,
      driver,
      vehicle,
      input,
    );

    // Step 6: Build plan ID and persist
    const planId = this.generatePlanId();

    // Make segment IDs globally unique by prefixing with planId
    for (const seg of simulation.segments) {
      seg.segmentId = `${planId}-${seg.segmentId}`;
    }

    const plan = await this.persistPlan(
      planId,
      simulation,
      input,
      driver,
      vehicle,
    );

    this.logger.log(
      `Route planned: ${planId}, ${simulation.segments.length} segments, ` +
        `${Math.round(simulation.totalDistanceMiles)}mi, feasible=${simulation.feasibilityIssues.length === 0}`,
    );

    // Step 7: Build response
    return this.buildResponse(planId, simulation, plan);
  }

  // ─── Step 1: Resolve Entities ────────────────────────────────────────────

  private async resolveDriver(driverId: string, tenantId: number) {
    const driver = await this.prisma.driver.findFirst({
      where: { driverId, tenantId },
    });
    if (!driver) {
      throw new BadRequestException(`Driver not found: ${driverId}`);
    }
    return driver;
  }

  private async resolveVehicle(vehicleId: string, tenantId: number) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { vehicleId, tenantId },
    });
    if (!vehicle) {
      throw new BadRequestException(`Vehicle not found: ${vehicleId}`);
    }
    return vehicle;
  }

  private async resolveLoadStops(
    loadIds: string[],
    tenantId: number,
  ): Promise<ResolvedStop[]> {
    const loads = await this.prisma.load.findMany({
      where: {
        loadId: { in: loadIds },
        tenantId,
      },
      include: {
        stops: {
          include: { stop: true },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });

    if (loads.length !== loadIds.length) {
      const foundIds = loads.map((l) => l.loadId);
      const missing = loadIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(`Loads not found: ${missing.join(', ')}`);
    }

    const resolvedStops: ResolvedStop[] = [];
    const seen = new Set<string>();

    for (const load of loads) {
      for (const loadStop of load.stops) {
        const stop = loadStop.stop;
        if (!stop.lat || !stop.lon) continue;

        // Deduplicate by (loadId, stopId, actionType)
        const key = `${load.id}-${stop.id}-${loadStop.actionType}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const actionType = loadStop.actionType as 'pickup' | 'delivery';
        const appointmentWindow =
          loadStop.earliestArrival && loadStop.latestArrival
            ? {
                start: this.parseTimeToDate(loadStop.earliestArrival),
                end: this.parseTimeToDate(loadStop.latestArrival),
              }
            : undefined;

        resolvedStops.push({
          id: stop.id,
          stopId: stop.stopId,
          name: stop.name,
          lat: stop.lat,
          lon: stop.lon,
          type: actionType === 'pickup' ? 'pickup' : 'delivery',
          timezone: stop.timezone ?? 'America/New_York',
          appointmentWindow,
          dockDurationHours: loadStop.estimatedDockHours ?? DOCK_DEFAULT_HOURS,
          customerName: load.customerName,
          loadId: load.loadId,
        });
      }
    }

    return resolvedStops;
  }

  private parseTimeToDate(timeStr: string): Date {
    // Convert HH:MM string to a Date object (today)
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
    return date;
  }

  // ─── Step 4: TSP Optimization ────────────────────────────────────────────

  private optimizeStopSequence(
    stops: ResolvedStop[],
    distanceMatrix: DistanceMatrix,
  ): ResolvedStop[] {
    if (stops.length <= 3) {
      // Origin + 1-2 stops: no optimization needed
      // Just ensure pickups before deliveries for same load
      return this.ensurePickupBeforeDelivery(stops);
    }

    // Nearest-neighbor heuristic starting from origin
    const origin = stops[0];
    const remaining = [...stops.slice(1)];
    const ordered: ResolvedStop[] = [origin];
    let current = origin;

    while (remaining.length > 0) {
      let bestIdx = 0;
      let bestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];

        // Skip delivery if its pickup hasn't been visited yet
        if (
          candidate.type === 'delivery' &&
          candidate.loadId &&
          !this.isPickupVisited(candidate.loadId, ordered, remaining)
        ) {
          continue;
        }

        const key = this.matrixKey(current.stopId, candidate.stopId);
        const entry = distanceMatrix.get(key);
        const dist = entry?.distanceMiles ?? Infinity;

        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }

      const next = remaining.splice(bestIdx, 1)[0];
      ordered.push(next);
      current = next;
    }

    return ordered;
  }

  private isPickupVisited(
    loadId: string,
    visited: ResolvedStop[],
    remaining: ResolvedStop[],
  ): boolean {
    // Check if there's a pickup for this load in the remaining list
    const hasUnvisitedPickup = remaining.some(
      (s) => s.type === 'pickup' && s.loadId === loadId,
    );
    if (!hasUnvisitedPickup) return true; // pickup already visited or doesn't exist

    // Check if pickup is in visited
    return visited.some((s) => s.type === 'pickup' && s.loadId === loadId);
  }

  private ensurePickupBeforeDelivery(stops: ResolvedStop[]): ResolvedStop[] {
    const result = [stops[0]]; // keep origin first
    const remaining = stops.slice(1);

    // Group by loadId, ensure pickup comes before delivery
    const pickups = remaining.filter((s) => s.type === 'pickup');
    const deliveries = remaining.filter((s) => s.type === 'delivery');
    const others = remaining.filter(
      (s) => s.type !== 'pickup' && s.type !== 'delivery',
    );

    result.push(...pickups, ...deliveries, ...others);
    return result;
  }

  // ─── Step 5: Route Simulation ────────────────────────────────────────────

  private async simulateRoute(
    stops: ResolvedStop[],
    distanceMatrix: DistanceMatrix,
    driver: any,
    vehicle: any,
    input: RoutePlanRequest,
  ): Promise<SimulationState> {
    const state: SimulationState = {
      currentTime: new Date(input.departureTime),
      hosState: this.buildInitialHOSState(driver),
      fuelRemainingGallons: DEFAULT_FUEL_TANK_GALLONS,
      currentLat: stops[0].lat,
      currentLon: stops[0].lon,
      currentLocation: stops[0].name,
      segments: [],
      segmentCounter: 0,
      dayCounter: 1,
      dailyBreakdown: [this.newDayBreakdown(1, input.departureTime)],
      weatherAlerts: [],
      feasibilityIssues: [],
      totalDistanceMiles: 0,
      totalDriveTimeHours: 0,
      totalCostEstimate: 0,
    };

    const hasSleeperBerth = vehicle.hasSleeperBerth ?? true;
    const preferredRest = input.dispatcherParams?.preferredRestType ?? 'auto';
    const maxDetourMiles = input.dispatcherParams?.maxDetourMilesForFuel ?? 15;
    const dockRestMap = this.buildDockRestMap(
      input.dispatcherParams?.dockRestStops,
    );

    // Simulate each leg between consecutive stops
    for (let i = 0; i < stops.length - 1; i++) {
      if (state.segments.length >= MAX_SIMULATION_SEGMENTS) {
        state.feasibilityIssues.push('Route exceeded maximum segment limit');
        break;
      }

      const from = stops[i];
      const to = stops[i + 1];

      // Get driving distance/time for this leg
      const key = this.matrixKey(from.stopId, to.stopId);
      const matrixEntry = distanceMatrix.get(key);
      const legDistanceMiles =
        matrixEntry?.distanceMiles ?? this.haversineDistance(from, to);
      const legDriveTimeHours =
        matrixEntry?.driveTimeHours ?? legDistanceMiles / 55;

      // Skip zero-distance legs (same location, e.g. origin = first stop)
      if (legDistanceMiles < 0.1) {
        // Still update position to the next stop
        state.currentLat = to.lat;
        state.currentLon = to.lon;
        state.currentLocation = to.name;
      } else {
        // Check weather along this leg
        const legWeather = await this.checkWeatherForLeg(
          from,
          to,
          state.currentTime,
        );
        state.weatherAlerts.push(...legWeather);
        const weatherMultiplier = this.getMaxWeatherMultiplier(legWeather);
        const adjustedDriveTime = legDriveTimeHours * weatherMultiplier;

        // Check if we need fuel before this leg
        const fuelNeeded = legDistanceMiles / DEFAULT_MPG;
        if (state.fuelRemainingGallons - fuelNeeded < FUEL_RESERVE_GALLONS) {
          await this.insertFuelStop(state, from, to, maxDetourMiles);
        }

        // Check HOS: can we drive this leg without rest?
        const hoursAvailable = this.hosEngine.hoursUntilRestRequired(
          state.hosState,
        );

        if (hoursAvailable < adjustedDriveTime) {
          // Need rest before driving. Decide what kind.
          const restDecision = this.decideRest(
            state,
            adjustedDriveTime,
            hasSleeperBerth,
            preferredRest,
            stops,
            i,
            distanceMatrix,
          );

          await this.applyRestDecision(state, restDecision);
        }

        // Check 30-min break requirement
        if (state.hosState.hoursSinceBreak >= 7.5 && adjustedDriveTime > 0.5) {
          this.insertBreak(state);
        }

        // Build drive segment
        const routeResult = await this.getRouteGeometry(from, to);
        this.addDriveSegment(
          state,
          from,
          to,
          legDistanceMiles,
          adjustedDriveTime,
          legWeather,
          routeResult?.geometry,
        );
      }

      // Handle dock activity at destination (if pickup/delivery)
      if (to.type === 'pickup' || to.type === 'delivery') {
        const dockHours = to.dockDurationHours ?? DOCK_DEFAULT_HOURS;
        const dockRestConfig = dockRestMap.get(to.stopId);

        if (
          dockRestConfig?.convertToRest &&
          dockRestConfig.truckParkedHours >= this.minRestHours
        ) {
          // Dock time converts to rest — update HOS first, then record segment
          state.hosState = this.hosEngine.simulateAfterFullRest(state.hosState);
          this.addDockSegment(state, to, dockHours, true);
        } else {
          // Dock time is on-duty (not driving) — update HOS first, then record segment
          state.hosState = this.hosEngine.simulateAfterDriving(
            state.hosState,
            0,
            dockHours,
          );
          this.addDockSegment(state, to, dockHours, false);
        }
      }
    }

    return state;
  }

  // ─── Rest Decision Logic ─────────────────────────────────────────────────

  private decideRest(
    state: SimulationState,
    neededDriveHours: number,
    hasSleeperBerth: boolean,
    preferredRest: string,
    stops: ResolvedStop[],
    currentStopIdx: number,
    distanceMatrix: DistanceMatrix,
  ): RestDecision {
    const compliance = this.hosEngine.validateCompliance(state.hosState);

    // If cycle hours exhausted, need 34h restart
    if (compliance.needsRestart) {
      return { type: 'restart_34h' };
    }

    // If only break is needed (8h trigger approaching)
    if (
      compliance.hoursAvailableToDrive >= neededDriveHours &&
      compliance.hoursUntilBreakRequired < neededDriveHours
    ) {
      return { type: 'break_30min' };
    }

    // Need full rest. Decide between full rest vs split.
    if (preferredRest === 'full' || !hasSleeperBerth) {
      return { type: 'full_rest', hours: this.minRestHours };
    }

    if (preferredRest === 'split_8_2') {
      if (state.hosState.splitRestState?.firstPortionCompleted) {
        return { type: 'split_second', splitType: '8_2', hours: 2 };
      }
      return { type: 'split_first', splitType: '8_2', hours: 8 };
    }

    if (preferredRest === 'split_7_3') {
      if (state.hosState.splitRestState?.firstPortionCompleted) {
        return { type: 'split_second', splitType: '7_3', hours: 3 };
      }
      return { type: 'split_first', splitType: '7_3', hours: 7 };
    }

    // Auto mode: look ahead to determine best strategy
    return this.lookAheadRestDecision(
      state,
      neededDriveHours,
      hasSleeperBerth,
      stops,
      currentStopIdx,
      distanceMatrix,
    );
  }

  private lookAheadRestDecision(
    state: SimulationState,
    neededDriveHours: number,
    hasSleeperBerth: boolean,
    stops: ResolvedStop[],
    currentStopIdx: number,
    distanceMatrix: DistanceMatrix,
  ): RestDecision {
    // Look ahead: calculate total remaining drive hours
    let remainingDriveHours = neededDriveHours;
    for (let i = currentStopIdx + 1; i < stops.length - 1; i++) {
      const key = this.matrixKey(stops[i].stopId, stops[i + 1].stopId);
      const entry = distanceMatrix.get(key);
      remainingDriveHours += entry?.driveTimeHours ?? 2;
    }

    // If already in a split, complete it
    if (state.hosState.splitRestState?.firstPortionCompleted) {
      const splitType = state.hosState.splitRestState.firstPortionType;
      if (splitType === 'sleeper_7') {
        return { type: 'split_second', splitType: '7_3', hours: 3 };
      }
      if (splitType === 'sleeper_8') {
        return { type: 'split_second', splitType: '8_2', hours: 2 };
      }
    }

    // If remaining journey is short (< 16h of driving), full rest is fine
    if (remainingDriveHours <= 16 || !hasSleeperBerth) {
      return { type: 'full_rest', hours: this.minRestHours };
    }

    // For longer journeys, try split rest to save time
    // 8/2 split: 8h first portion now, then 2h later (saves 0h total but more flexible)
    return { type: 'split_first', splitType: '8_2', hours: 8 };
  }

  private async applyRestDecision(
    state: SimulationState,
    decision: RestDecision,
  ): Promise<void> {
    switch (decision.type) {
      case 'none':
        break;

      case 'break_30min':
        this.insertBreak(state);
        break;

      case 'full_rest':
        this.addRestSegment(
          state,
          'full_rest',
          decision.hours,
          'HOS daily limit reached',
        );
        state.hosState = this.hosEngine.simulateAfterFullRest(state.hosState);
        this.advanceDay(state, decision.hours);
        break;

      case 'split_first':
        this.addRestSegment(
          state,
          `split_${decision.splitType}_first`,
          decision.hours,
          `Split sleeper berth (${decision.splitType}) - first portion`,
        );
        state.hosState = this.hosEngine.simulateAfterSplitRest(
          state.hosState,
          decision.splitType,
          'first',
        );
        if (decision.hours >= 7) {
          this.advanceDay(state, decision.hours);
        }
        break;

      case 'split_second':
        this.addRestSegment(
          state,
          `split_${decision.splitType}_second`,
          decision.hours,
          `Split sleeper berth (${decision.splitType}) - second portion`,
        );
        state.hosState = this.hosEngine.simulateAfterSplitRest(
          state.hosState,
          decision.splitType,
          'second',
        );
        break;

      case 'restart_34h':
        this.addRestSegment(
          state,
          'restart_34h',
          34,
          '70-hour cycle limit reached',
        );
        state.hosState = this.hosEngine.simulateAfter34hRestart(state.hosState);
        this.advanceDay(state, 34);
        break;
    }
  }

  // ─── Segment Builders ────────────────────────────────────────────────────

  private addDriveSegment(
    state: SimulationState,
    from: ResolvedStop,
    to: ResolvedStop,
    distanceMiles: number,
    driveTimeHours: number,
    weather: WeatherAlert[],
    geometry?: string,
  ): void {
    const arrival = new Date(
      state.currentTime.getTime() + driveTimeHours * 3600000,
    );

    state.hosState = this.hosEngine.simulateAfterDriving(
      state.hosState,
      driveTimeHours,
      driveTimeHours,
    );

    const segment: SegmentResult = {
      segmentId: `seg-${++state.segmentCounter}`,
      sequenceOrder: state.segmentCounter,
      segmentType: 'drive',
      fromLocation: from.name,
      toLocation: to.name,
      fromLat: from.lat,
      fromLon: from.lon,
      toLat: to.lat,
      toLon: to.lon,
      distanceMiles,
      driveTimeHours,
      estimatedArrival: arrival,
      estimatedDeparture: new Date(state.currentTime),
      hosStateAfter: { ...state.hosState },
      weatherAlerts: weather.length > 0 ? weather : undefined,
      routeGeometry: geometry,
      timezone: to.timezone,
    };

    state.segments.push(segment);
    state.currentTime = arrival;
    state.currentLat = to.lat;
    state.currentLon = to.lon;
    state.currentLocation = to.name;
    state.totalDistanceMiles += distanceMiles;
    state.totalDriveTimeHours += driveTimeHours;

    // Deduct fuel consumption
    state.fuelRemainingGallons -= distanceMiles / DEFAULT_MPG;

    // Update daily breakdown
    const currentDay = state.dailyBreakdown[state.dailyBreakdown.length - 1];
    if (currentDay) {
      currentDay.driveHours += driveTimeHours;
      currentDay.onDutyHours += driveTimeHours;
      currentDay.segments++;
    }
  }

  private addDockSegment(
    state: SimulationState,
    stop: ResolvedStop,
    dockHours: number,
    isDocktimeConverted: boolean,
  ): void {
    const arrival = new Date(state.currentTime);
    const departure = new Date(
      state.currentTime.getTime() + dockHours * 3600000,
    );

    const segment: SegmentResult = {
      segmentId: `seg-${++state.segmentCounter}`,
      sequenceOrder: state.segmentCounter,
      segmentType: 'dock',
      fromLocation: stop.name,
      toLocation: stop.name,
      fromLat: stop.lat,
      fromLon: stop.lon,
      toLat: stop.lat,
      toLon: stop.lon,
      dockDurationHours: dockHours,
      customerName: stop.customerName,
      isDocktimeConverted,
      estimatedArrival: arrival,
      estimatedDeparture: departure,
      hosStateAfter: { ...state.hosState },
      timezone: stop.timezone,
    };

    state.segments.push(segment);
    state.currentTime = departure;

    const currentDay = state.dailyBreakdown[state.dailyBreakdown.length - 1];
    if (currentDay) {
      if (!isDocktimeConverted) {
        currentDay.onDutyHours += dockHours;
      }
      currentDay.segments++;
    }
  }

  private addRestSegment(
    state: SimulationState,
    restType: string,
    restHours: number,
    reason: string,
  ): void {
    const arrival = new Date(state.currentTime);
    const departure = new Date(
      state.currentTime.getTime() + restHours * 3600000,
    );

    const segment: SegmentResult = {
      segmentId: `seg-${++state.segmentCounter}`,
      sequenceOrder: state.segmentCounter,
      segmentType: 'rest',
      fromLocation: state.currentLocation,
      toLocation: state.currentLocation,
      fromLat: state.currentLat,
      fromLon: state.currentLon,
      toLat: state.currentLat,
      toLon: state.currentLon,
      restDurationHours: restHours,
      restType,
      restReason: reason,
      estimatedArrival: arrival,
      estimatedDeparture: departure,
      hosStateAfter: { ...state.hosState },
    };

    state.segments.push(segment);
    state.currentTime = departure;

    const currentDay = state.dailyBreakdown[state.dailyBreakdown.length - 1];
    if (currentDay) {
      currentDay.restStops++;
      currentDay.segments++;
    }
  }

  private insertBreak(state: SimulationState): void {
    const arrival = new Date(state.currentTime);
    const departure = new Date(
      state.currentTime.getTime() + BREAK_DURATION_HOURS * 3600000,
    );

    const segment: SegmentResult = {
      segmentId: `seg-${++state.segmentCounter}`,
      sequenceOrder: state.segmentCounter,
      segmentType: 'break',
      fromLocation: state.currentLocation,
      toLocation: state.currentLocation,
      fromLat: state.currentLat,
      fromLon: state.currentLon,
      toLat: state.currentLat,
      toLon: state.currentLon,
      restDurationHours: BREAK_DURATION_HOURS,
      restType: 'mandatory_break',
      restReason: '30-minute break required after 8 hours on-duty',
      estimatedArrival: arrival,
      estimatedDeparture: departure,
      hosStateAfter: { ...state.hosState },
    };

    // Reset break clock only (not full rest)
    state.hosState = {
      ...state.hosState,
      hoursSinceBreak: 0,
    };

    segment.hosStateAfter = { ...state.hosState };

    state.segments.push(segment);
    state.currentTime = departure;
  }

  private async insertFuelStop(
    state: SimulationState,
    from: ResolvedStop,
    to: ResolvedStop,
    maxDetourMiles: number,
  ): Promise<void> {
    // Find fuel stops along the corridor
    const fuelStops = await this.fuelProvider.findFuelStopsAlongCorridor(
      from.lat,
      from.lon,
      to.lat,
      to.lon,
      maxDetourMiles,
    );

    if (fuelStops.length === 0) {
      // No fuel stops nearby - log warning but continue
      state.feasibilityIssues.push(
        `No fuel stops found between ${from.name} and ${to.name} within ${maxDetourMiles} miles`,
      );
      // Assume they fuel at the current location
      state.fuelRemainingGallons = DEFAULT_FUEL_TANK_GALLONS;
      return;
    }

    // Pick the cheapest fuel stop
    const fuelStop = fuelStops[0]; // already sorted by price
    const gallonsNeeded =
      DEFAULT_FUEL_TANK_GALLONS - state.fuelRemainingGallons;
    const fuelCost = gallonsNeeded * fuelStop.fuelPricePerGallon;

    const arrival = new Date(state.currentTime);
    const departure = new Date(
      state.currentTime.getTime() + FUELING_TIME_HOURS * 3600000,
    );

    const segment: SegmentResult = {
      segmentId: `seg-${++state.segmentCounter}`,
      sequenceOrder: state.segmentCounter,
      segmentType: 'fuel',
      fromLocation: state.currentLocation,
      toLocation: fuelStop.name,
      fromLat: state.currentLat,
      fromLon: state.currentLon,
      toLat: fuelStop.lat,
      toLon: fuelStop.lon,
      fuelGallons: gallonsNeeded,
      fuelCostEstimate: fuelCost,
      fuelStationName: fuelStop.name,
      fuelPricePerGallon: fuelStop.fuelPricePerGallon,
      detourMiles: fuelStop.distanceFromRoute,
      estimatedArrival: arrival,
      estimatedDeparture: departure,
      hosStateAfter: { ...state.hosState },
    };

    // Fueling is on-duty not-driving time
    state.hosState = this.hosEngine.simulateAfterDriving(
      state.hosState,
      0,
      FUELING_TIME_HOURS,
    );
    segment.hosStateAfter = { ...state.hosState };

    state.segments.push(segment);
    state.currentTime = departure;
    state.currentLat = fuelStop.lat;
    state.currentLon = fuelStop.lon;
    state.currentLocation = fuelStop.name;
    state.fuelRemainingGallons = DEFAULT_FUEL_TANK_GALLONS;
    state.totalCostEstimate += fuelCost;

    const currentDay = state.dailyBreakdown[state.dailyBreakdown.length - 1];
    if (currentDay) {
      currentDay.onDutyHours += FUELING_TIME_HOURS;
      currentDay.segments++;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private buildInitialHOSState(driver: any): HOSState {
    return {
      hoursDriven: driver.currentHoursDriven ?? 0,
      onDutyTime: driver.currentOnDutyTime ?? 0,
      hoursSinceBreak: driver.currentHoursSinceBreak ?? 0,
      cycleHoursUsed: driver.cycleHoursUsed ?? 0,
      cycleDaysData: (driver.cycleDaysData as any[]) ?? [],
      splitRestState: undefined,
    };
  }

  private buildDockRestMap(
    dockRestStops?: Array<{
      stopId: string;
      truckParkedHours: number;
      convertToRest: boolean;
    }>,
  ): Map<string, { truckParkedHours: number; convertToRest: boolean }> {
    const map = new Map();
    if (dockRestStops) {
      for (const entry of dockRestStops) {
        map.set(entry.stopId, {
          truckParkedHours: entry.truckParkedHours,
          convertToRest: entry.convertToRest,
        });
      }
    }
    return map;
  }

  private async checkWeatherForLeg(
    from: ResolvedStop,
    to: ResolvedStop,
    departureTime: Date,
  ): Promise<WeatherAlert[]> {
    try {
      return await this.weatherProvider.getWeatherAlongRoute(
        [
          { lat: from.lat, lon: from.lon },
          { lat: to.lat, lon: to.lon },
        ],
        departureTime,
      );
    } catch (err) {
      this.logger.warn(
        `Weather check failed for leg ${from.name}->${to.name}: ${err}`,
      );
      return [];
    }
  }

  private getMaxWeatherMultiplier(alerts: WeatherAlert[]): number {
    if (alerts.length === 0) return 1.0;
    return Math.max(...alerts.map((a) => a.driveTimeMultiplier));
  }

  private async getRouteGeometry(
    from: ResolvedStop,
    to: ResolvedStop,
  ): Promise<{ geometry: string } | null> {
    try {
      const result = await this.routingProvider.getRoute(
        { lat: from.lat, lon: from.lon },
        { lat: to.lat, lon: to.lon },
      );
      return { geometry: result.geometry };
    } catch {
      return null;
    }
  }

  private advanceDay(state: SimulationState, hoursAdvanced: number): void {
    // Check if we've crossed a day boundary
    const startOfRest = new Date(
      state.currentTime.getTime() - hoursAdvanced * 3600000,
    );
    const startDay = startOfRest.toISOString().split('T')[0];
    const endDay = state.currentTime.toISOString().split('T')[0];

    if (startDay !== endDay) {
      state.dayCounter++;
      state.dailyBreakdown.push(
        this.newDayBreakdown(state.dayCounter, state.currentTime),
      );
    }
  }

  private newDayBreakdown(day: number, date: Date): DayBreakdown {
    return {
      day,
      date: date.toISOString().split('T')[0],
      driveHours: 0,
      onDutyHours: 0,
      segments: 0,
      restStops: 0,
    };
  }

  private matrixKey(fromId: string, toId: string): string {
    return `${fromId}:${toId}`;
  }

  private haversineDistance(a: ResolvedStop, b: ResolvedStop): number {
    const R = 3959; // Earth radius in miles
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

    return R * c * 1.3; // 1.3 road factor
  }

  private generatePlanId(): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RP-${date}-${rand}`;
  }

  // ─── Step 6: Persist ─────────────────────────────────────────────────────

  private async persistPlan(
    planId: string,
    simulation: SimulationState,
    input: RoutePlanRequest,
    driver: any,
    vehicle: any,
  ) {
    const segments: CreateSegmentData[] = simulation.segments.map((seg) => ({
      segmentId: seg.segmentId,
      sequenceOrder: seg.sequenceOrder,
      fromLocation: seg.fromLocation,
      toLocation: seg.toLocation,
      segmentType: seg.segmentType,
      distanceMiles: seg.distanceMiles,
      driveTimeHours: seg.driveTimeHours,
      restType: seg.restType,
      restDurationHours: seg.restDurationHours,
      restReason: seg.restReason,
      fuelGallons: seg.fuelGallons,
      fuelCostEstimate: seg.fuelCostEstimate,
      fuelStationName: seg.fuelStationName,
      dockDurationHours: seg.dockDurationHours,
      customerName: seg.customerName,
      hosStateAfter: seg.hosStateAfter,
      estimatedArrival: seg.estimatedArrival,
      estimatedDeparture: seg.estimatedDeparture,
      fromLat: seg.fromLat,
      fromLon: seg.fromLon,
      toLat: seg.toLat,
      toLon: seg.toLon,
      timezone: seg.timezone,
      actionType: seg.segmentType,
      appointmentWindow: undefined,
      fuelPricePerGallon: seg.fuelPricePerGallon,
      detourMiles: seg.detourMiles,
      isDocktimeConverted: seg.isDocktimeConverted,
      weatherAlerts: seg.weatherAlerts,
      routeGeometry: seg.routeGeometry,
      fuelStateAfter: undefined,
      stopId: undefined,
    }));

    // Resolve load internal IDs from loadId strings
    const loads = await this.prisma.load.findMany({
      where: {
        loadId: { in: input.loadIds },
        tenantId: input.tenantId,
      },
      select: { id: true },
    });

    const lastSegment = simulation.segments[simulation.segments.length - 1];
    const estimatedArrival =
      lastSegment?.estimatedArrival ?? input.departureTime;

    const totalTripTimeHours =
      (estimatedArrival.getTime() - input.departureTime.getTime()) / 3600000;

    const complianceReport = this.buildComplianceReport(simulation);

    const planData: CreatePlanData = {
      planId,
      driverId: driver.id,
      vehicleId: vehicle.id,
      tenantId: input.tenantId,
      status: 'draft',
      optimizationPriority: input.optimizationPriority ?? 'minimize_time',
      totalDistanceMiles: simulation.totalDistanceMiles,
      totalDriveTimeHours: simulation.totalDriveTimeHours,
      totalOnDutyTimeHours: simulation.dailyBreakdown.reduce(
        (sum, d) => sum + d.onDutyHours,
        0,
      ),
      totalCostEstimate: simulation.totalCostEstimate,
      totalTripTimeHours,
      totalDrivingDays: simulation.dayCounter,
      isFeasible: simulation.feasibilityIssues.length === 0,
      feasibilityIssues:
        simulation.feasibilityIssues.length > 0
          ? simulation.feasibilityIssues
          : undefined,
      complianceReport,
      departureTime: input.departureTime,
      estimatedArrival,
      dispatcherParams: input.dispatcherParams,
      dailyBreakdown: simulation.dailyBreakdown,
      segments,
      loadIds: loads.map((l) => l.id),
    };

    return this.persistenceService.createPlan(planData);
  }

  // ─── Step 7: Build Response ──────────────────────────────────────────────

  private buildResponse(
    planId: string,
    simulation: SimulationState,
    _plan: any,
  ): RoutePlanResult {
    const lastSegment = simulation.segments[simulation.segments.length - 1];
    const complianceReport = this.buildComplianceReport(simulation);

    return {
      planId,
      status: 'draft',
      isFeasible: simulation.feasibilityIssues.length === 0,
      feasibilityIssues: simulation.feasibilityIssues,
      totalDistanceMiles: Math.round(simulation.totalDistanceMiles * 10) / 10,
      totalDriveTimeHours:
        Math.round(simulation.totalDriveTimeHours * 100) / 100,
      totalTripTimeHours: lastSegment
        ? Math.round(
            ((lastSegment.estimatedArrival.getTime() -
              simulation.segments[0].estimatedDeparture.getTime()) /
              3600000) *
              100,
          ) / 100
        : 0,
      totalDrivingDays: simulation.dayCounter,
      totalCostEstimate: Math.round(simulation.totalCostEstimate * 100) / 100,
      departureTime: simulation.segments[0]?.estimatedDeparture ?? new Date(),
      estimatedArrival: lastSegment?.estimatedArrival ?? new Date(),
      segments: simulation.segments,
      complianceReport,
      weatherAlerts: simulation.weatherAlerts,
      dailyBreakdown: simulation.dailyBreakdown,
    };
  }

  private buildComplianceReport(simulation: SimulationState): ComplianceReport {
    const restSegments = simulation.segments.filter(
      (s) => s.segmentType === 'rest',
    );
    const breakSegments = simulation.segments.filter(
      (s) => s.segmentType === 'break',
    );

    return {
      isFullyCompliant: simulation.feasibilityIssues.length === 0,
      totalRestStops: restSegments.length,
      totalBreaks: breakSegments.length,
      total34hRestarts: restSegments.filter((s) => s.restType === 'restart_34h')
        .length,
      totalSplitRests: restSegments.filter((s) =>
        s.restType?.startsWith('split_'),
      ).length,
      dockTimeConversions: simulation.segments.filter(
        (s) => s.isDocktimeConverted,
      ).length,
      rules: [
        {
          rule: '11-hour driving limit',
          status: 'pass' as const,
        },
        {
          rule: '14-hour duty window',
          status: 'pass' as const,
        },
        {
          rule: '30-minute break requirement',
          status:
            breakSegments.length > 0
              ? ('addressed' as const)
              : ('pass' as const),
        },
        {
          rule: '10-hour off-duty rest',
          status:
            restSegments.length > 0
              ? ('addressed' as const)
              : ('pass' as const),
        },
        {
          rule: '70-hour/8-day cycle',
          status: restSegments.some((s) => s.restType === 'restart_34h')
            ? ('addressed' as const)
            : ('pass' as const),
        },
      ],
    };
  }
}
