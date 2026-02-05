import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseTenantController } from '../../../../shared/base/base-tenant.controller';
import { ExternalSourceGuard, ExternalSourceCheck } from '../../../../shared/guards/external-source.guard';
import { CurrentUser } from '../../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { VehiclesService } from '../services/vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto';

/**
 * VehiclesController handles HTTP requests for vehicle management.
 * Extends BaseTenantController for tenant utilities.
 */
@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController extends BaseTenantController {
  constructor(
    prisma: PrismaService,
    private readonly vehiclesService: VehiclesService,
  ) {
    super(prisma);
  }

  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'List all active vehicles' })
  async listVehicles(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    const vehicles = await this.vehiclesService.findAll(tenantDbId);

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
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new vehicle' })
  async createVehicle(
    @CurrentUser() user: any,
    @Body() createVehicleDto: CreateVehicleDto,
  ) {
    const tenantDbId = await this.getTenantDbId(user);

    const vehicle = await this.vehiclesService.create(
      tenantDbId,
      createVehicleDto.vehicle_id,
      {
        unit_number: createVehicleDto.unit_number,
        fuel_capacity_gallons: createVehicleDto.fuel_capacity_gallons,
        current_fuel_gallons: createVehicleDto.current_fuel_gallons,
        mpg: createVehicleDto.mpg,
      },
    );

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
  }

  @Put(':vehicle_id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.DISPATCHER)
  @UseGuards(ExternalSourceGuard)
  @ExternalSourceCheck('vehicle')
  @ApiOperation({ summary: 'Update vehicle' })
  @ApiParam({ name: 'vehicle_id', description: 'Vehicle ID' })
  async updateVehicle(
    @CurrentUser() user: any,
    @Param('vehicle_id') vehicleId: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    const tenantDbId = await this.getTenantDbId(user);

    const vehicle = await this.vehiclesService.update(
      vehicleId,
      tenantDbId,
      {
        unit_number: updateVehicleDto.unit_number,
        fuel_capacity_gallons: updateVehicleDto.fuel_capacity_gallons,
        current_fuel_gallons: updateVehicleDto.current_fuel_gallons,
        mpg: updateVehicleDto.mpg,
      },
    );

    return {
      id: vehicle.id,
      vehicle_id: vehicle.vehicleId,
      unit_number: vehicle.unitNumber,
      fuel_capacity_gallons: vehicle.fuelCapacityGallons,
      current_fuel_gallons: vehicle.currentFuelGallons,
      mpg: vehicle.mpg,
      updated_at: vehicle.updatedAt,
    };
  }

  @Delete(':vehicle_id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @UseGuards(ExternalSourceGuard)
  @ExternalSourceCheck('vehicle')
  @ApiOperation({ summary: 'Soft delete vehicle (set isActive=false)' })
  @ApiParam({ name: 'vehicle_id', description: 'Vehicle ID' })
  async deleteVehicle(
    @CurrentUser() user: any,
    @Param('vehicle_id') vehicleId: string,
  ) {
    const tenantDbId = await this.getTenantDbId(user);

    await this.vehiclesService.remove(vehicleId, tenantDbId);

    return {
      vehicle_id: vehicleId,
      message: 'Vehicle deactivated successfully',
    };
  }
}
