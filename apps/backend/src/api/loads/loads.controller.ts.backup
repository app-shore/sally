import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Loads')
@Controller('loads')
export class LoadsController {
  private readonly logger = new Logger(LoadsController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new load with stops' })
  async createLoad(
    @Body()
    body: {
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
    },
  ) {
    this.logger.log(`Create load requested: ${body.load_number}`);

    try {
      const loadId = `LOAD-${body.load_number}`;

      const load = await this.prisma.load.create({
        data: {
          loadId,
          loadNumber: body.load_number,
          status: 'pending',
          weightLbs: body.weight_lbs,
          commodityType: body.commodity_type,
          specialRequirements: body.special_requirements || null,
          customerName: body.customer_name,
          isActive: true,
        },
      });

      // Create load stops
      for (const stopData of body.stops) {
        // Look up stop by stop_id string
        const stop = await this.prisma.stop.findFirst({
          where: { stopId: stopData.stop_id },
        });

        if (!stop) {
          await this.prisma.load.delete({ where: { id: load.id } });
          throw new HttpException(
            { detail: `Stop not found: ${stopData.stop_id}` },
            HttpStatus.NOT_FOUND,
          );
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

      return this.formatLoadResponse(result);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Create load failed: ${error.message}`);
      throw new HttpException(
        { detail: error.message || 'Failed to create load' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'List all loads with optional filtering' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customer_name', required: false })
  async listLoads(
    @Query('status') status?: string,
    @Query('customer_name') customerName?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    this.logger.log(`List loads requested`);

    try {
      const loads = await this.prisma.load.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(customerName
            ? { customerName: { contains: customerName, mode: 'insensitive' } }
            : {}),
        },
        include: { stops: true },
        orderBy: { createdAt: 'desc' },
        skip: Number(offset),
        take: Number(limit),
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
    } catch (error) {
      this.logger.error(`List loads failed: ${error.message}`);
      throw new HttpException(
        { detail: 'Failed to fetch loads' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':load_id')
  @ApiOperation({ summary: 'Get load details with stops' })
  async getLoad(@Param('load_id') loadId: string) {
    this.logger.log(`Get load requested: ${loadId}`);

    try {
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
        throw new HttpException(
          { detail: `Load not found: ${loadId}` },
          HttpStatus.NOT_FOUND,
        );
      }

      return this.formatLoadResponse(load);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Get load failed: ${error.message}`);
      throw new HttpException(
        { detail: 'Failed to fetch load' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private formatLoadResponse(load: any) {
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
