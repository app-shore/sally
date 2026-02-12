import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

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

    const validStatuses = ['draft', 'pending', 'assigned', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}`);
    }

    const updateData: any = { status, updatedAt: new Date() };

    // Auto-generate tracking token when load goes active
    if (status === 'active' && !load.trackingToken) {
      const token = `${load.loadNumber}-${randomBytes(3).toString('hex')}`;
      updateData.trackingToken = token;
    }

    const updated = await this.prisma.load.update({
      where: { id: load.id },
      data: updateData,
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
   * Find loads scoped to a specific customer ID
   */
  async findByCustomerId(customerId: number, tenantId?: number) {
    const loads = await this.prisma.load.findMany({
      where: { customerId, isActive: true, ...(tenantId ? { tenantId } : {}) },
      include: {
        stops: { include: { stop: true }, orderBy: { sequenceOrder: 'asc' } },
        routePlanLoads: {
          include: {
            plan: { select: { estimatedArrival: true, isActive: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return loads.map((load) => {
      const firstPickup = load.stops.find((s) => s.actionType === 'pickup');
      const lastDelivery = [...load.stops].reverse().find((s) => s.actionType === 'delivery');
      const activePlan = load.routePlanLoads.map((rpl) => rpl.plan).find((p) => p.isActive);

      return {
        load_id: load.loadId,
        load_number: load.loadNumber,
        status: load.status,
        customer_name: load.customerName,
        estimated_delivery: activePlan?.estimatedArrival?.toISOString() || null,
        origin_city: firstPickup?.stop?.city || null,
        origin_state: firstPickup?.stop?.state || null,
        destination_city: lastDelivery?.stop?.city || null,
        destination_state: lastDelivery?.stop?.state || null,
        tracking_token: load.trackingToken,
        created_at: load.createdAt.toISOString(),
      };
    });
  }

  /**
   * Find a single load for a customer (validates customer ownership)
   */
  async findOneForCustomer(loadId: string, customerId: number) {
    const load = await this.prisma.load.findFirst({
      where: { loadId, customerId },
      include: {
        stops: { include: { stop: true }, orderBy: { sequenceOrder: 'asc' } },
      },
    });
    if (!load) throw new NotFoundException(`Load not found: ${loadId}`);
    return this.formatLoadResponse(load);
  }

  /**
   * Create a load from customer portal request (creates as draft)
   */
  async createFromCustomerRequest(data: {
    tenant_id: number;
    customer_id: number;
    customer_name: string;
    pickup_address: string;
    pickup_city: string;
    pickup_state: string;
    delivery_address: string;
    delivery_city: string;
    delivery_state: string;
    pickup_date?: string;
    delivery_date?: string;
    weight_lbs: number;
    equipment_type?: string;
    commodity_type?: string;
    notes?: string;
  }) {
    const loadNumber = `REQ-${Date.now().toString(36).toUpperCase()}`;

    return this.create({
      tenant_id: data.tenant_id,
      load_number: loadNumber,
      weight_lbs: data.weight_lbs,
      commodity_type: data.commodity_type || 'general',
      special_requirements: data.notes || undefined,
      customer_name: data.customer_name,
      customer_id: data.customer_id,
      equipment_type: data.equipment_type || undefined,
      intake_source: 'portal',
      intake_metadata: { requested_by: 'customer_portal' },
      status: 'draft',
      stops: [
        {
          stop_id: `stop_${Date.now()}_pickup`,
          sequence_order: 1,
          action_type: 'pickup',
          estimated_dock_hours: 2,
          earliest_arrival: data.pickup_date || undefined,
          name: data.pickup_address,
          address: data.pickup_address,
          city: data.pickup_city,
          state: data.pickup_state,
        },
        {
          stop_id: `stop_${Date.now()}_delivery`,
          sequence_order: 2,
          action_type: 'delivery',
          estimated_dock_hours: 2,
          earliest_arrival: data.delivery_date || undefined,
          name: data.delivery_address,
          address: data.delivery_address,
          city: data.delivery_city,
          state: data.delivery_state,
        },
      ],
    });
  }

  /**
   * Get public tracking data by tracking token (no auth)
   */
  async getPublicTracking(token: string) {
    const load = await this.prisma.load.findFirst({
      where: { trackingToken: token },
      include: {
        stops: {
          include: { stop: true },
          orderBy: { sequenceOrder: 'asc' },
        },
        tenant: { select: { companyName: true } },
        routePlanLoads: {
          include: {
            plan: {
              select: {
                estimatedArrival: true,
                status: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!load) {
      throw new NotFoundException('Tracking information not found');
    }

    const timeline = this.buildTrackingTimeline(load);

    const activePlan = load.routePlanLoads
      .map((rpl) => rpl.plan)
      .find((p) => p.isActive);

    return {
      load_number: load.loadNumber,
      status: load.status,
      customer_name: load.customerName,
      carrier_name: load.tenant.companyName,
      equipment_type: load.equipmentType,
      weight_lbs: load.weightLbs,
      estimated_delivery: activePlan?.estimatedArrival?.toISOString() || null,
      timeline,
      stops: load.stops.map((ls) => ({
        sequence_order: ls.sequenceOrder,
        action_type: ls.actionType,
        city: ls.stop?.city || null,
        state: ls.stop?.state || null,
      })),
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
   * Build tracking timeline events from load data
   */
  private buildTrackingTimeline(load: any) {
    const events: Array<{ event: string; status: string; timestamp?: string; detail?: string }> = [];

    events.push({
      event: 'Order Confirmed',
      status: 'completed',
      timestamp: load.createdAt.toISOString(),
    });

    if (['assigned', 'in_transit', 'delivered'].includes(load.status)) {
      events.push({
        event: 'Driver Assigned',
        status: 'completed',
      });
    }

    const firstPickup = load.stops.find((s: any) => s.actionType === 'pickup');
    if (firstPickup?.actualDockHours !== null && ['in_transit', 'delivered'].includes(load.status)) {
      events.push({
        event: 'Picked Up',
        status: 'completed',
        detail: `${firstPickup.stop?.city}, ${firstPickup.stop?.state}`,
      });
    }

    if (load.status === 'in_transit') {
      events.push({
        event: 'In Transit',
        status: 'current',
      });
    }

    const lastDelivery = [...load.stops].reverse().find((s: any) => s.actionType === 'delivery');
    if (load.status === 'delivered') {
      events.push({
        event: 'Delivered',
        status: 'completed',
        detail: `${lastDelivery?.stop?.city}, ${lastDelivery?.stop?.state}`,
      });
    } else {
      events.push({
        event: 'Delivery',
        status: 'upcoming',
        detail: `${lastDelivery?.stop?.city}, ${lastDelivery?.stop?.state}`,
      });
    }

    return events;
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
