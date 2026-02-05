import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { Load } from '@prisma/client';

/**
 * LoadsService handles all load-related business logic.
 * Extracted from LoadsController to separate concerns.
 */
@Injectable()
export class LoadsService {
  private readonly logger = new Logger(LoadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new load with stops
   */
  async create(data: {
    load_number: string;
    weight_lbs: number;
    commodity_type: string;
    special_requirements?: string;
    customer_name: string;
    stops: Array<{
      stop_id: string;
      sequence_order: number;
      action_type: string;
      earliest_arrival?: string;
      latest_arrival?: string;
      estimated_dock_hours: number;
    }>;
  }) {
    const loadId = `LOAD-${data.load_number}`;

    const load = await this.prisma.load.create({
      data: {
        loadId,
        loadNumber: data.load_number,
        status: 'pending',
        weightLbs: data.weight_lbs,
        commodityType: data.commodity_type,
        specialRequirements: data.special_requirements || null,
        customerName: data.customer_name,
        isActive: true,
      },
    });

    // Create load stops
    for (const stopData of data.stops) {
      // Look up stop by stop_id string
      const stop = await this.prisma.stop.findFirst({
        where: { stopId: stopData.stop_id },
      });

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
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.customer_name
          ? {
              customerName: {
                contains: filters.customer_name,
                mode: 'insensitive',
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
      is_active: load.isActive,
      created_at: load.createdAt.toISOString(),
      updated_at: load.updatedAt.toISOString(),
      stops: stopsData,
    };
  }
}
