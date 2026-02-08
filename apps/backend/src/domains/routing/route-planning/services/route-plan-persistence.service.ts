import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface CreateSegmentData {
  segmentId: string;
  sequenceOrder: number;
  fromLocation?: string;
  toLocation?: string;
  segmentType: string; // 'drive' | 'rest' | 'fuel' | 'dock'
  distanceMiles?: number;
  driveTimeHours?: number;
  restType?: string;
  restDurationHours?: number;
  restReason?: string;
  fuelGallons?: number;
  fuelCostEstimate?: number;
  fuelStationName?: string;
  dockDurationHours?: number;
  customerName?: string;
  hosStateAfter?: any;
  estimatedArrival?: Date;
  estimatedDeparture?: Date;
  fromLat?: number;
  fromLon?: number;
  toLat?: number;
  toLon?: number;
  timezone?: string;
  actionType?: string;
  appointmentWindow?: any;
  fuelPricePerGallon?: number;
  detourMiles?: number;
  isDocktimeConverted?: boolean;
  weatherAlerts?: any;
  routeGeometry?: string;
  fuelStateAfter?: any;
  stopId?: number;
}

export interface CreatePlanData {
  planId: string;
  driverId: number;
  vehicleId: number;
  tenantId: number;
  status?: string;
  optimizationPriority?: string;
  totalDistanceMiles: number;
  totalDriveTimeHours: number;
  totalOnDutyTimeHours: number;
  totalCostEstimate: number;
  totalTripTimeHours: number;
  totalDrivingDays: number;
  isFeasible: boolean;
  feasibilityIssues?: any;
  complianceReport?: any;
  departureTime?: Date;
  estimatedArrival?: Date;
  dispatcherParams?: any;
  dailyBreakdown?: any;
  segments: CreateSegmentData[];
  loadIds: number[];
}

export interface PlanFilters {
  tenantId?: number;
  driverId?: number;
  status?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * RoutePlanPersistenceService handles all database operations for route plans.
 *
 * Responsible for creating, reading, updating, and querying RoutePlan records
 * along with their associated RouteSegments and RoutePlanLoad join records.
 * All multi-step writes use Prisma transactions to ensure data consistency.
 */
@Injectable()
export class RoutePlanPersistenceService {
  private readonly logger = new Logger(RoutePlanPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a route plan with all segments and load associations in a single transaction.
   *
   * Creates the RoutePlan record, all RouteSegment records (ordered by sequenceOrder),
   * and RoutePlanLoad join records linking the plan to its loads.
   *
   * @param data - The plan data including segments and load IDs
   * @returns The created plan with segments and loads included
   */
  async createPlan(data: CreatePlanData) {
    const { segments, loadIds, ...planFields } = data;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create the route plan
      const plan = await tx.routePlan.create({
        data: {
          planId: planFields.planId,
          driverId: planFields.driverId,
          vehicleId: planFields.vehicleId,
          tenantId: planFields.tenantId,
          status: planFields.status ?? 'draft',
          optimizationPriority:
            planFields.optimizationPriority ?? 'minimize_time',
          totalDistanceMiles: planFields.totalDistanceMiles,
          totalDriveTimeHours: planFields.totalDriveTimeHours,
          totalOnDutyTimeHours: planFields.totalOnDutyTimeHours,
          totalCostEstimate: planFields.totalCostEstimate,
          totalTripTimeHours: planFields.totalTripTimeHours,
          totalDrivingDays: planFields.totalDrivingDays,
          isFeasible: planFields.isFeasible,
          feasibilityIssues: planFields.feasibilityIssues ?? undefined,
          complianceReport: planFields.complianceReport ?? undefined,
          departureTime: planFields.departureTime ?? undefined,
          estimatedArrival: planFields.estimatedArrival ?? undefined,
          dispatcherParams: planFields.dispatcherParams ?? undefined,
          dailyBreakdown: planFields.dailyBreakdown ?? undefined,
        },
      });

      // 2. Create all segments
      for (const segment of segments) {
        await tx.routeSegment.create({
          data: {
            segmentId: segment.segmentId,
            planId: plan.id,
            sequenceOrder: segment.sequenceOrder,
            fromLocation: segment.fromLocation ?? undefined,
            toLocation: segment.toLocation ?? undefined,
            segmentType: segment.segmentType,
            distanceMiles: segment.distanceMiles ?? undefined,
            driveTimeHours: segment.driveTimeHours ?? undefined,
            restType: segment.restType ?? undefined,
            restDurationHours: segment.restDurationHours ?? undefined,
            restReason: segment.restReason ?? undefined,
            fuelGallons: segment.fuelGallons ?? undefined,
            fuelCostEstimate: segment.fuelCostEstimate ?? undefined,
            fuelStationName: segment.fuelStationName ?? undefined,
            dockDurationHours: segment.dockDurationHours ?? undefined,
            customerName: segment.customerName ?? undefined,
            hosStateAfter: segment.hosStateAfter ?? undefined,
            estimatedArrival: segment.estimatedArrival ?? undefined,
            estimatedDeparture: segment.estimatedDeparture ?? undefined,
            fromLat: segment.fromLat ?? undefined,
            fromLon: segment.fromLon ?? undefined,
            toLat: segment.toLat ?? undefined,
            toLon: segment.toLon ?? undefined,
            timezone: segment.timezone ?? undefined,
            actionType: segment.actionType ?? undefined,
            appointmentWindow: segment.appointmentWindow ?? undefined,
            fuelPricePerGallon: segment.fuelPricePerGallon ?? undefined,
            detourMiles: segment.detourMiles ?? undefined,
            isDocktimeConverted: segment.isDocktimeConverted ?? false,
            weatherAlerts: segment.weatherAlerts ?? undefined,
            routeGeometry: segment.routeGeometry ?? undefined,
            fuelStateAfter: segment.fuelStateAfter ?? undefined,
            stopId: segment.stopId ?? undefined,
          },
        });
      }

      // 3. Create load associations
      for (const loadId of loadIds) {
        await tx.routePlanLoad.create({
          data: {
            planId: plan.id,
            loadId,
          },
        });
      }

      // 4. Return the full plan with relations
      return tx.routePlan.findUnique({
        where: { id: plan.id },
        include: {
          segments: {
            orderBy: { sequenceOrder: 'asc' },
          },
          loads: {
            include: { load: true },
          },
        },
      });
    });

    this.logger.log(
      `Route plan created: ${data.planId} with ${segments.length} segments and ${loadIds.length} loads`,
    );

    return result;
  }

  /**
   * Retrieve a route plan by its string planId.
   *
   * Includes segments (ordered by sequenceOrder) and loads (through RoutePlanLoad).
   *
   * @param planId - The unique string plan identifier (e.g. "RP-20260206-ABC123")
   * @returns The plan with segments and loads
   * @throws NotFoundException if the plan does not exist
   */
  async getPlanById(planId: string) {
    const plan = await this.prisma.routePlan.findUnique({
      where: { planId },
      include: {
        segments: {
          orderBy: { sequenceOrder: 'asc' },
        },
        loads: {
          include: { load: true },
        },
        driver: true,
        vehicle: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(`Route plan not found: ${planId}`);
    }

    return plan;
  }

  /**
   * Find the currently active route plan for a given driver.
   *
   * At most one plan should be active per driver at any time (enforced by activatePlan).
   *
   * @param driverId - The driver's numeric ID
   * @returns The active plan with segments, or null if none is active
   */
  async getActivePlanForDriver(driverId: number) {
    const plan = await this.prisma.routePlan.findFirst({
      where: {
        driverId,
        isActive: true,
      },
      include: {
        segments: {
          orderBy: { sequenceOrder: 'asc' },
        },
        loads: {
          include: { load: true },
        },
        driver: true,
        vehicle: true,
      },
    });

    return plan;
  }

  /**
   * Activate a route plan.
   *
   * Within a transaction:
   * 1. Deactivates any existing active plan for the same driver
   * 2. Sets the target plan to isActive=true, status='active', activatedAt=now()
   *
   * @param planId - The string planId to activate
   * @returns The activated plan with segments
   * @throws NotFoundException if the plan does not exist
   */
  async activatePlan(planId: string) {
    // First, look up the plan to get the driverId
    const existingPlan = await this.prisma.routePlan.findUnique({
      where: { planId },
    });

    if (!existingPlan) {
      throw new NotFoundException(`Route plan not found: ${planId}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Deactivate any existing active plan for the same driver
      await tx.routePlan.updateMany({
        where: {
          driverId: existingPlan.driverId,
          isActive: true,
        },
        data: {
          isActive: false,
          status: 'superseded',
        },
      });

      // 2. Activate the target plan
      const activated = await tx.routePlan.update({
        where: { planId },
        data: {
          isActive: true,
          status: 'active',
          activatedAt: new Date(),
        },
        include: {
          segments: {
            orderBy: { sequenceOrder: 'asc' },
          },
          loads: {
            include: { load: true },
          },
          driver: true,
          vehicle: true,
        },
      });

      return activated;
    });

    this.logger.log(
      `Route plan activated: ${planId} for driver ${existingPlan.driverId}`,
    );

    return result;
  }

  /**
   * List route plans with optional filters and pagination.
   *
   * Returns plans ordered by createdAt descending. Includes a segment count
   * (via _count) but does not include full segment data for performance.
   *
   * @param filters - Optional filtering and pagination parameters
   * @returns Array of plans with segment counts
   */
  async listPlans(filters: PlanFilters = {}) {
    const {
      tenantId,
      driverId,
      status,
      isActive,
      limit = 50,
      offset = 0,
    } = filters;

    const where: any = {};
    if (tenantId !== undefined) where.tenantId = tenantId;
    if (driverId !== undefined) where.driverId = driverId;
    if (status !== undefined) where.status = status;
    if (isActive !== undefined) where.isActive = isActive;

    const [plans, total] = await Promise.all([
      this.prisma.routePlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          driver: {
            select: { driverId: true, name: true },
          },
          vehicle: {
            select: { vehicleId: true, unitNumber: true },
          },
          _count: {
            select: { segments: true, loads: true },
          },
        },
      }),
      this.prisma.routePlan.count({ where }),
    ]);

    return {
      plans,
      total,
      limit,
      offset,
    };
  }

  /**
   * Cancel a route plan.
   *
   * Sets status to 'cancelled', records cancelledAt timestamp, and deactivates the plan.
   *
   * @param planId - The string planId to cancel
   * @returns The cancelled plan
   * @throws NotFoundException if the plan does not exist
   */
  async cancelPlan(planId: string) {
    const existingPlan = await this.prisma.routePlan.findUnique({
      where: { planId },
    });

    if (!existingPlan) {
      throw new NotFoundException(`Route plan not found: ${planId}`);
    }

    const cancelled = await this.prisma.routePlan.update({
      where: { planId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        isActive: false,
      },
      include: {
        segments: {
          orderBy: { sequenceOrder: 'asc' },
        },
        loads: {
          include: { load: true },
        },
      },
    });

    this.logger.log(`Route plan cancelled: ${planId}`);

    return cancelled;
  }
}
