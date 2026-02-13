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
      vin: vehicle.vin,
      equipment_type: vehicle.equipmentType,
      status: vehicle.status,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      license_plate: vehicle.licensePlate,
      license_plate_state: vehicle.licensePlateState,
      has_sleeper_berth: vehicle.hasSleeperBerth,
      gross_weight_lbs: vehicle.grossWeightLbs,
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

    const vehicle = await this.vehiclesService.create(tenantDbId, {
      unit_number: createVehicleDto.unit_number,
      vin: createVehicleDto.vin,
      equipment_type: createVehicleDto.equipment_type,
      fuel_capacity_gallons: createVehicleDto.fuel_capacity_gallons,
      mpg: createVehicleDto.mpg,
      status: createVehicleDto.status,
      make: createVehicleDto.make,
      model: createVehicleDto.model,
      year: createVehicleDto.year,
      license_plate: createVehicleDto.license_plate,
      license_plate_state: createVehicleDto.license_plate_state,
      has_sleeper_berth: createVehicleDto.has_sleeper_berth,
      gross_weight_lbs: createVehicleDto.gross_weight_lbs,
      current_fuel_gallons: createVehicleDto.current_fuel_gallons,
    });

    return {
      id: vehicle.id,
      vehicle_id: vehicle.vehicleId,
      unit_number: vehicle.unitNumber,
      vin: vehicle.vin,
      equipment_type: vehicle.equipmentType,
      status: vehicle.status,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      license_plate: vehicle.licensePlate,
      license_plate_state: vehicle.licensePlateState,
      has_sleeper_berth: vehicle.hasSleeperBerth,
      gross_weight_lbs: vehicle.grossWeightLbs,
      fuel_capacity_gallons: vehicle.fuelCapacityGallons,
      current_fuel_gallons: vehicle.currentFuelGallons,
      mpg: vehicle.mpg,
      external_vehicle_id: vehicle.externalVehicleId,
      external_source: vehicle.externalSource,
      last_synced_at: vehicle.lastSyncedAt?.toISOString(),
      created_at: vehicle.createdAt.toISOString(),
      updated_at: vehicle.updatedAt.toISOString(),
    };
  }

  @Put(':vehicle_id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Update vehicle' })
  @ApiParam({ name: 'vehicle_id', description: 'Vehicle ID' })
  async updateVehicle(
    @CurrentUser() user: any,
    @Param('vehicle_id') vehicleId: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    const tenantDbId = await this.getTenantDbId(user);

    const vehicle = await this.vehiclesService.update(vehicleId, tenantDbId, {
      unit_number: updateVehicleDto.unit_number,
      vin: updateVehicleDto.vin,
      equipment_type: updateVehicleDto.equipment_type,
      fuel_capacity_gallons: updateVehicleDto.fuel_capacity_gallons,
      mpg: updateVehicleDto.mpg,
      status: updateVehicleDto.status,
      make: updateVehicleDto.make,
      model: updateVehicleDto.model,
      year: updateVehicleDto.year,
      license_plate: updateVehicleDto.license_plate,
      license_plate_state: updateVehicleDto.license_plate_state,
      has_sleeper_berth: updateVehicleDto.has_sleeper_berth,
      gross_weight_lbs: updateVehicleDto.gross_weight_lbs,
      current_fuel_gallons: updateVehicleDto.current_fuel_gallons,
    });

    return {
      id: vehicle.id,
      vehicle_id: vehicle.vehicleId,
      unit_number: vehicle.unitNumber,
      vin: vehicle.vin,
      equipment_type: vehicle.equipmentType,
      status: vehicle.status,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      license_plate: vehicle.licensePlate,
      license_plate_state: vehicle.licensePlateState,
      has_sleeper_berth: vehicle.hasSleeperBerth,
      gross_weight_lbs: vehicle.grossWeightLbs,
      fuel_capacity_gallons: vehicle.fuelCapacityGallons,
      current_fuel_gallons: vehicle.currentFuelGallons,
      mpg: vehicle.mpg,
      external_vehicle_id: vehicle.externalVehicleId,
      external_source: vehicle.externalSource,
      last_synced_at: vehicle.lastSyncedAt?.toISOString(),
      created_at: vehicle.createdAt.toISOString(),
      updated_at: vehicle.updatedAt.toISOString(),
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
