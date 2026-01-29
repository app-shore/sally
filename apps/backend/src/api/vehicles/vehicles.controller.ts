import { Controller, Get, Post, Put, Delete, Param, Body, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehiclesController {
  private readonly logger = new Logger(VehiclesController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all active vehicles' })
  async listVehicles() {
    this.logger.log('List vehicles requested');

    try {
      const vehicles = await this.prisma.vehicle.findMany({
        where: { isActive: true },
        orderBy: { vehicleId: 'asc' },
      });

      return vehicles.map((vehicle) => ({
        id: vehicle.id,
        vehicle_id: vehicle.vehicleId,
        unit_number: vehicle.unitNumber,
        fuel_capacity_gallons: vehicle.fuelCapacityGallons,
        current_fuel_gallons: vehicle.currentFuelGallons,
        mpg: vehicle.mpg,
      }));
    } catch (error) {
      this.logger.error(`List vehicles failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to fetch vehicles' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
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
    @Body()
    body: {
      vehicle_id: string;
      unit_number: string;
      fuel_capacity_gallons?: number;
      current_fuel_gallons?: number;
      mpg?: number;
    },
  ) {
    this.logger.log(`Create vehicle: ${body.vehicle_id} - ${body.unit_number}`);

    try {
      const vehicle = await this.prisma.vehicle.create({
        data: {
          vehicleId: body.vehicle_id,
          unitNumber: body.unit_number,
          fuelCapacityGallons: body.fuel_capacity_gallons,
          currentFuelGallons: body.current_fuel_gallons,
          mpg: body.mpg,
          isActive: true,
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
    @Param('vehicle_id') vehicleId: string,
    @Body()
    body: {
      unit_number?: string;
      fuel_capacity_gallons?: number;
      current_fuel_gallons?: number;
      mpg?: number;
    },
  ) {
    this.logger.log(`Update vehicle: ${vehicleId}`);

    try {
      const vehicle = await this.prisma.vehicle.update({
        where: { vehicleId },
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
      this.logger.error(`Update vehicle failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to update vehicle' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':vehicle_id')
  @ApiOperation({ summary: 'Soft delete vehicle (set isActive=false)' })
  @ApiParam({ name: 'vehicle_id', description: 'Vehicle ID' })
  async deleteVehicle(@Param('vehicle_id') vehicleId: string) {
    this.logger.log(`Delete vehicle: ${vehicleId}`);

    try {
      const vehicle = await this.prisma.vehicle.update({
        where: { vehicleId },
        data: { isActive: false },
      });

      return {
        vehicle_id: vehicle.vehicleId,
        message: 'Vehicle deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Delete vehicle failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to delete vehicle' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
