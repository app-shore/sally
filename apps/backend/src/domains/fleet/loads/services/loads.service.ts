import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class LoadsService {
  private readonly logger = new Logger(LoadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new load with stops
   * Supports inline stop creation for manual entry (when stop doesn't exist yet)
   */
  async create(data: {
    tenant_id: number;
    load_number: string;
    weight_lbs: number;
    commodity_type: string;
    special_requirements?: string;
    customer_name: string;
    equipment_type?: string;
    intake_source?: string;
    intake_metadata?: any;
    customer_id?: number;
    status?: string;
    stops: Array<{
      stop_id: string;
      sequence_order: number;
      action_type: string;
      earliest_arrival?: string;
      latest_arrival?: string;
      estimated_dock_hours: number;
      name?: string;
      address?: string;
      city?: string;
      state?: string;
    }>;
  }) {
    const loadId = `LOAD-${data.load_number}`;

    const load = await this.prisma.load.create({
      data: {
        loadId,
        loadNumber: data.load_number,
        status: data.status || 'pending',
        weightLbs: data.weight_lbs,
        commodityType: data.commodity_type,
        specialRequirements: data.special_requirements || null,
        customerName: data.customer_name,
        equipmentType: data.equipment_type || null,
        intakeSource: data.intake_source || 'manual',
        intakeMetadata: data.intake_metadata || null,
        customerId: data.customer_id || null,
        tenantId: data.tenant_id,
        isActive: true,
      },
    });

    // Create load stops
    for (const stopData of data.stops) {
      // Look up stop by stop_id string
      let stop = await this.prisma.stop.findFirst({
        where: { stopId: stopData.stop_id },
      });

      // Create stop inline if it doesn't exist (manual entry flow)
      if (!stop && stopData.name) {
        stop = await this.prisma.stop.create({
          data: {
            stopId: stopData.stop_id,
            name: stopData.name,
            address: stopData.address || null,
            city: stopData.city || null,
            state: stopData.state || null,
            locationType: 'customer',
            isActive: true,
            tenantId: data.tenant_id,
          },
        });
      }

      if (!stop) {
        // Rollback: delete the created load
        await this.prisma.load.delete({ where: { id: load.id } });
        throw new NotFoundException(`Stop not found: ${stopData.stop_id}`);
      }

      await this.prisma.loadStop.create({
        data: {
          loadId: load.id,
          stopId: stop.id,
          sequenceOrder: stopData.sequence_order,
          actionType: stopData.action_type,
          earliestArrival: stopData.earliest_arrival || null,
          latestArrival: stopData.latest_arrival || null,
          estimatedDockHours: stopData.estimated_dock_hours,
        },
      });
    }

    // Return load with stops
    const result = await this.prisma.load.findUnique({
      where: { id: load.id },
      include: {
        stops: {
          include: { stop: true },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Load created: ${loadId}`);
    return this.formatLoadResponse(result);
  }

  /**
   * Find all loads with optional filtering and pagination
   */
  async findAll(
    tenantId: number,
    filters?: {
      status?: string;
      customer_name?: string;
    },
    pagination?: {
      limit?: number;
      offset?: number;
    },
  ) {
    const loads = await this.prisma.load.findMany({
      where: {
        tenantId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.customer_name
          ? {
              customerName: {
                contains: filters.customer_name,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      include: { stops: true },
      orderBy: { createdAt: 'desc' },
      skip: pagination?.offset || 0,
      take: pagination?.limit || 50,
    });

    return loads.map((load) => ({
      id: load.id,
      load_id: load.loadId,
      load_number: load.loadNumber,
      status: load.status,
      customer_name: load.customerName,
      stop_count: load.stops.length,
      weight_lbs: load.weightLbs,
      commodity_type: load.commodityType,
      equipment_type: load.equipmentType,
      intake_source: load.intakeSource,
      external_load_id: load.externalLoadId,
      external_source: load.externalSource,
      last_synced_at: load.lastSyncedAt?.toISOString(),
    }));
  }

  /**
   * Find one load by ID with stops
   */
  async findOne(loadId: string) {
    const load = await this.prisma.load.findFirst({
      where: { loadId },
      include: {
        stops: {
          include: { stop: true },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });

    if (!load) {
      throw new NotFoundException(`Load not found: ${loadId}`);
    }

    return this.formatLoadResponse(load);
  }

  /**
   * Update load status
   */
  async updateStatus(loadId: string, status: string) {
    const load = await this.prisma.load.findFirst({ where: { loadId } });
    if (!load) {
      throw new NotFoundException(`Load not found: ${loadId}`);
    }

    const validStatuses = ['draft', 'pending', 'planned', 'active', 'in_transit', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}`);
    }

    const updated = await this.prisma.load.update({
      where: { id: load.id },
      data: { status, updatedAt: new Date() },
      include: {
        stops: {
          include: { stop: true },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Load ${loadId} status updated: ${status}`);
    return this.formatLoadResponse(updated);
  }

  /**
   * Assign driver and vehicle to load
   */
  async assignLoad(loadId: string, driverId: string, vehicleId: string) {
    const load = await this.prisma.load.findFirst({ where: { loadId } });
    if (!load) {
      throw new NotFoundException(`Load not found: ${loadId}`);
    }

    const driver = await this.prisma.driver.findFirst({ where: { driverId } });
    if (!driver) {
      throw new NotFoundException(`Driver not found: ${driverId}`);
    }

    const vehicle = await this.prisma.vehicle.findFirst({ where: { vehicleId } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle not found: ${vehicleId}`);
    }

    await this.prisma.load.update({
      where: { id: load.id },
      data: { driverId: driver.id, vehicleId: vehicle.id },
    });

    this.logger.log(`Load ${loadId} assigned to driver ${driverId} and vehicle ${vehicleId}`);

    return {
      success: true,
      message: 'Load assigned successfully',
      load_id: loadId,
      driver_id: driverId,
      vehicle_id: vehicleId,
      driver_name: driver.name,
      vehicle_unit_number: vehicle.unitNumber,
    };
  }

  /**
   * Generate a tracking token for a load
   */
  async generateTrackingToken(loadId: string) {
    const load = await this.prisma.load.findFirst({ where: { loadId } });
    if (!load) throw new NotFoundException(`Load not found: ${loadId}`);

    const token = `${load.loadNumber}-${randomBytes(3).toString('hex')}`;
    await this.prisma.load.update({
      where: { id: load.id },
      data: { trackingToken: token },
    });

    return { tracking_token: token, tracking_url: `/track/${token}` };
  }

  /**
   * Duplicate an existing load
   */
  async duplicate(loadId: string, tenantId: number) {
    const original = await this.prisma.load.findFirst({
      where: { loadId },
      include: { stops: { include: { stop: true }, orderBy: { sequenceOrder: 'asc' } } },
    });
    if (!original) throw new NotFoundException(`Load not found: ${loadId}`);

    const newLoadNumber = `${original.loadNumber}-COPY`;
    const newLoadId = `LOAD-${newLoadNumber}`;

    const newLoad = await this.prisma.load.create({
      data: {
        loadId: newLoadId,
        loadNumber: newLoadNumber,
        status: 'pending',
        weightLbs: original.weightLbs,
        commodityType: original.commodityType,
        specialRequirements: original.specialRequirements,
        customerName: original.customerName,
        equipmentType: original.equipmentType,
        intakeSource: 'manual',
        customerId: original.customerId,
        tenantId,
        isActive: true,
      },
    });

    // Copy stops
    for (const loadStop of original.stops) {
      await this.prisma.loadStop.create({
        data: {
          loadId: newLoad.id,
          stopId: loadStop.stopId,
          sequenceOrder: loadStop.sequenceOrder,
          actionType: loadStop.actionType,
          estimatedDockHours: loadStop.estimatedDockHours,
        },
      });
    }

    const result = await this.prisma.load.findUnique({
      where: { id: newLoad.id },
      include: { stops: { include: { stop: true }, orderBy: { sequenceOrder: 'asc' } } },
    });

    this.logger.log(`Load duplicated: ${loadId} -> ${newLoadId}`);
    return this.formatLoadResponse(result);
  }

  /**
   * Format load response with stops
   */
  formatLoadResponse(load: any) {
    const stopsData = load.stops.map((loadStop: any) => ({
      id: loadStop.id,
      stop_id: loadStop.stopId,
      sequence_order: loadStop.sequenceOrder,
      action_type: loadStop.actionType,
      earliest_arrival: loadStop.earliestArrival,
      latest_arrival: loadStop.latestArrival,
      estimated_dock_hours: loadStop.estimatedDockHours,
      actual_dock_hours: loadStop.actualDockHours,
      stop_name: loadStop.stop?.name || null,
      stop_city: loadStop.stop?.city || null,
      stop_state: loadStop.stop?.state || null,
      stop_address: loadStop.stop?.address || null,
    }));

    return {
      id: load.id,
      load_id: load.loadId,
      load_number: load.loadNumber,
      status: load.status,
      weight_lbs: load.weightLbs,
      commodity_type: load.commodityType,
      special_requirements: load.specialRequirements,
      customer_name: load.customerName,
      equipment_type: load.equipmentType,
      intake_source: load.intakeSource,
      tracking_token: load.trackingToken,
      customer_id: load.customerId,
      driver_id: load.driverId,
      vehicle_id: load.vehicleId,
      is_active: load.isActive,
      created_at: load.createdAt.toISOString(),
      updated_at: load.updatedAt.toISOString(),
      stops: stopsData,
    };
  }
}
