import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseTenantController } from '../../../../shared/base/base-tenant.controller';
import { ExternalSourceGuard, ExternalSourceCheck } from '../../../../shared/guards/external-source.guard';
import { CurrentUser } from '../../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { IntegrationManagerService } from '../../../../services/integration-manager/integration-manager.service';
import { DriversActivationService } from '../services/drivers-activation.service';
import { DriversService } from '../services/drivers.service';
import { CreateDriverDto, UpdateDriverDto } from '../dto';

/**
 * DriversController handles HTTP requests for driver management.
 * Extends BaseTenantController for tenant utilities.
 */
@ApiTags('Drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController extends BaseTenantController {
  constructor(
    prisma: PrismaService,
    private readonly driversService: DriversService,
    @Inject(IntegrationManagerService)
    private readonly integrationManager: IntegrationManagerService,
    private readonly driversActivationService: DriversActivationService,
  ) {
    super(prisma);
  }

  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary:
      'List all active drivers (basic info only, HOS fetched from external API)',
  })
  async listDrivers(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    const drivers = await this.driversService.findAll(tenantDbId);

    // Return only basic driver info
    // HOS data should be fetched from /api/v1/external/hos/:driver_id
    return drivers.map((driver) => ({
      id: driver.id,
      driver_id: driver.driverId,
      name: driver.name,
      is_active: driver.isActive,
      external_driver_id: driver.externalDriverId,
      external_source: driver.externalSource,
      last_synced_at: driver.lastSyncedAt?.toISOString(),
      created_at: driver.createdAt.toISOString(),
      updated_at: driver.updatedAt.toISOString(),
    }));
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new driver (basic info only)' })
  async createDriver(
    @CurrentUser() user: any,
    @Body() createDriverDto: CreateDriverDto,
  ) {
    const tenantDbId = await this.getTenantDbId(user);

    const driver = await this.driversService.create(
      tenantDbId,
      createDriverDto.driver_id,
      createDriverDto.name,
    );

    return {
      id: driver.id,
      driver_id: driver.driverId,
      name: driver.name,
      is_active: driver.isActive,
      created_at: driver.createdAt,
      updated_at: driver.updatedAt,
    };
  }

  @Put(':driver_id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @UseGuards(ExternalSourceGuard)
  @ExternalSourceCheck('driver')
  @ApiOperation({ summary: 'Update driver basic info' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  async updateDriver(
    @CurrentUser() user: any,
    @Param('driver_id') driverId: string,
    @Body() updateDriverDto: UpdateDriverDto,
  ) {
    const tenantDbId = await this.getTenantDbId(user);

    const driver = await this.driversService.update(
      driverId,
      tenantDbId,
      updateDriverDto.name,
    );

    return {
      id: driver.id,
      driver_id: driver.driverId,
      name: driver.name,
      is_active: driver.isActive,
      updated_at: driver.updatedAt,
    };
  }

  @Delete(':driver_id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @UseGuards(ExternalSourceGuard)
  @ExternalSourceCheck('driver')
  @ApiOperation({ summary: 'Soft delete driver (set isActive=false)' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  async deleteDriver(
    @CurrentUser() user: any,
    @Param('driver_id') driverId: string,
  ) {
    const tenantDbId = await this.getTenantDbId(user);

    await this.driversService.remove(driverId, tenantDbId);

    return {
      driver_id: driverId,
      message: 'Driver deactivated successfully',
    };
  }

  @Get(':driver_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER, UserRole.DRIVER)
  @ApiOperation({ summary: 'Get driver by ID' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  @ApiResponse({
    status: 200,
    description: 'Driver details',
  })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async getDriver(
    @Param('driver_id') driverId: string,
    @CurrentUser() user: any,
  ) {
    const tenantDbId = await this.getTenantDbId(user);
    const driver = await this.driversService.findOne(driverId, tenantDbId);

    return {
      id: driver.id,
      driver_id: driver.driverId,
      name: driver.name,
      is_active: driver.isActive,
      created_at: driver.createdAt,
      updated_at: driver.updatedAt,
    };
  }

  @Get(':driverId/hos')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary:
      'Get live HOS data for driver from integration (with cache fallback)',
  })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  async getDriverHOS(
    @Param('driverId') driverId: string,
    @CurrentUser() user: any,
  ) {
    const tenant = await this.getTenant(user.tenantId);
    const hosData = await this.integrationManager.getDriverHOS(
      tenant.id,
      driverId,
    );

    return hosData;
  }

  @Get('pending/list')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get all pending drivers awaiting activation' })
  async getPendingDrivers(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.driversActivationService.getPendingDrivers(tenantDbId);
  }

  @Get('inactive/list')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get all inactive drivers' })
  async getInactiveDrivers(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.driversActivationService.getInactiveDrivers(tenantDbId);
  }

  @Post(':driver_id/activate')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Activate a pending driver' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  async activateDriver(
    @Param('driver_id') driverId: string,
    @CurrentUser() user: any,
  ) {
    const tenant = await this.getTenant(user.tenantId);

    return this.driversActivationService.activateDriver(driverId, {
      id: user.id,
      tenant: { id: tenant.id },
    });
  }

  @Post(':driver_id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Deactivate an active driver' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  async deactivateDriver(
    @Param('driver_id') driverId: string,
    @CurrentUser() user: any,
    @Body('reason') reason: string,
  ) {
    const tenant = await this.getTenant(user.tenantId);

    return this.driversActivationService.deactivateDriver(
      driverId,
      {
        id: user.id,
        tenant: { id: tenant.id },
      },
      reason,
    );
  }

  @Post(':driver_id/reactivate')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Reactivate an inactive driver' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  async reactivateDriver(
    @Param('driver_id') driverId: string,
    @CurrentUser() user: any,
  ) {
    const tenant = await this.getTenant(user.tenantId);

    return this.driversActivationService.reactivateDriver(driverId, {
      id: user.id,
      tenant: { id: tenant.id },
    });
  }
}
