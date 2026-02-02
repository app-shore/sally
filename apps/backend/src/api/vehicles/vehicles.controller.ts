import { Controller, Get, Post, Put, Delete, Param, Body, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  private readonly logger = new Logger(VehiclesController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate that a vehicle is not from an external source before allowing modification
   */
  private async validateNotExternal(
    vehicleId: string,
    tenantId: number,
    operation: string
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new HttpException(
        { detail: `Vehicle not found: ${vehicleId}` },
        HttpStatus.NOT_FOUND
      );
    }

    if (vehicle.externalSource) {
      throw new HttpException(
        {
          detail: `Cannot ${operation} vehicle from external source: ${vehicle.externalSource}. This is a read-only integration record.`,
          external_source: vehicle.externalSource
        },
        HttpStatus.FORBIDDEN
      );
    }
  }

  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'List all active vehicles' })
  async listVehicles(@CurrentUser() user: any) {
    this.logger.log(`List vehicles requested by user ${user.userId} in tenant ${user.tenantId}`);

    try {
      // Get tenant ID from authenticated user
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      const vehicles = await this.prisma.vehicle.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
        },
        orderBy: { vehicleId: 'asc' },
      });

      return vehicles.map((vehicle) => ({
        id: vehicle.id,
        vehicle_id: vehicle.vehicleId,
        unit_number: vehicle.unitNumber,
        fuel_capacity_gallons: vehicle.fuelCapacityGallons,
        current_fuel_gallons: vehicle.currentFuelGallons,
        mpg: vehicle.mpg,
        external_vehicle_id: vehicle.externalVehicleId,
        external_source: vehicle.externalSource,
        last_synced_at: vehicle.lastSyncedAt?.toISOString(),
        created_at: vehicle.createdAt.toISOString(),
        updated_at: vehicle.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error(`List vehicles failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to fetch vehicles' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        vehicle_id: { type: 'string' },
        unit_number: { type: 'string' },
        fuel_capacity_gallons: { type: 'number' },
        current_fuel_gallons: { type: 'number' },
        mpg: { type: 'number' },
      },
      required: ['vehicle_id', 'unit_number'],
    },
  })
  async createVehicle(
    @CurrentUser() user: any,
    @Body()
    body: {
      vehicle_id: string;
      unit_number: string;
      fuel_capacity_gallons?: number;
      current_fuel_gallons?: number;
      mpg?: number;
    },
  ) {
    this.logger.log(`Create vehicle: ${body.vehicle_id} - ${body.unit_number} by user ${user.userId}`);

    try {
      // Get tenant ID from authenticated user
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      const vehicle = await this.prisma.vehicle.create({
        data: {
          vehicleId: body.vehicle_id,
          unitNumber: body.unit_number,
          fuelCapacityGallons: body.fuel_capacity_gallons,
          currentFuelGallons: body.current_fuel_gallons,
          mpg: body.mpg,
          isActive: true,
          tenantId: tenant.id,
        },
      });

      return {
        id: vehicle.id,
        vehicle_id: vehicle.vehicleId,
        unit_number: vehicle.unitNumber,
        fuel_capacity_gallons: vehicle.fuelCapacityGallons,
        current_fuel_gallons: vehicle.currentFuelGallons,
        mpg: vehicle.mpg,
        is_active: vehicle.isActive,
        created_at: vehicle.createdAt,
      };
    } catch (error) {
      this.logger.error(`Create vehicle failed: ${error.message}`);
      if (error.code === 'P2002') {
        throw new HttpException({ detail: 'Vehicle ID already exists' }, HttpStatus.CONFLICT);
      }
      throw new HttpException({ detail: 'Failed to create vehicle' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':vehicle_id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Update vehicle' })
  @ApiParam({ name: 'vehicle_id', description: 'Vehicle ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        unit_number: { type: 'string' },
        fuel_capacity_gallons: { type: 'number' },
        current_fuel_gallons: { type: 'number' },
        mpg: { type: 'number' },
      },
    },
  })
  async updateVehicle(
    @CurrentUser() user: any,
    @Param('vehicle_id') vehicleId: string,
    @Body()
    body: {
      unit_number?: string;
      fuel_capacity_gallons?: number;
      current_fuel_gallons?: number;
      mpg?: number;
    },
  ) {
    this.logger.log(`Update vehicle: ${vehicleId} by user ${user.userId}`);

    try {
      // Get tenant ID from authenticated user
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      if (!tenant) {
        throw new HttpException({ detail: 'Tenant not found' }, HttpStatus.NOT_FOUND);
      }

      // Validate vehicle is not from external source
      await this.validateNotExternal(vehicleId, tenant.id, 'update');

      const vehicle = await this.prisma.vehicle.update({
        where: {
          vehicleId_tenantId: {
            vehicleId,
            tenantId: tenant.id,
          },
        },
        data: {
          ...(body.unit_number ? { unitNumber: body.unit_number } : {}),
          ...(body.fuel_capacity_gallons !== undefined ? { fuelCapacityGallons: body.fuel_capacity_gallons } : {}),
          ...(body.current_fuel_gallons !== undefined ? { currentFuelGallons: body.current_fuel_gallons } : {}),
          ...(body.mpg !== undefined ? { mpg: body.mpg } : {}),
        },
      });

      return {
        id: vehicle.id,
        vehicle_id: vehicle.vehicleId,
        unit_number: vehicle.unitNumber,
        fuel_capacity_gallons: vehicle.fuelCapacityGallons,
        current_fuel_gallons: vehicle.currentFuelGallons,
        mpg: vehicle.mpg,
        updated_at: vehicle.updatedAt,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Update vehicle failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to update vehicle' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':vehicle_id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Soft delete vehicle (set isActive=false)' })
  @ApiParam({ name: 'vehicle_id', description: 'Vehicle ID' })
  async deleteVehicle(@CurrentUser() user: any, @Param('vehicle_id') vehicleId: string) {
    this.logger.log(`Delete vehicle: ${vehicleId} by user ${user.userId}`);

    try {
      // Get tenant ID from authenticated user
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      if (!tenant) {
        throw new HttpException({ detail: 'Tenant not found' }, HttpStatus.NOT_FOUND);
      }

      // Validate vehicle is not from external source
      await this.validateNotExternal(vehicleId, tenant.id, 'delete');

      const vehicle = await this.prisma.vehicle.update({
        where: {
          vehicleId_tenantId: {
            vehicleId,
            tenantId: tenant.id,
          },
        },
        data: { isActive: false },
      });

      return {
        vehicle_id: vehicle.vehicleId,
        message: 'Vehicle deactivated successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Delete vehicle failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to delete vehicle' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
