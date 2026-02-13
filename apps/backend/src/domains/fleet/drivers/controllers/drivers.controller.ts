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
import { IntegrationManagerService } from '../../../integrations/services/integration-manager.service';
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
    summary: 'List all active drivers with SALLY access status',
  })
  async listDrivers(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    const drivers = await this.driversService.findAll(tenantDbId);

    return drivers.map((driver) => {
      // Derive SALLY access status
      let sallyAccessStatus: 'ACTIVE' | 'INVITED' | 'NO_ACCESS' | 'DEACTIVATED' = 'NO_ACCESS';
      let linkedUserId: string | null = null;
      let pendingInvitationId: string | null = null;

      if (driver.user) {
        linkedUserId = driver.user.userId;
        sallyAccessStatus = driver.user.isActive ? 'ACTIVE' : 'DEACTIVATED';
      } else if (driver.invitations?.length > 0) {
        sallyAccessStatus = 'INVITED';
        pendingInvitationId = driver.invitations[0].invitationId;
      }

      return {
        id: driver.id,
        driver_id: driver.driverId,
        name: driver.name,
        license_number: driver.licenseNumber,
        license_state: driver.licenseState,
        cdl_class: driver.cdlClass,
        endorsements: driver.endorsements,
        phone: driver.phone,
        email: driver.email,
        status: driver.status,
        is_active: driver.isActive,
        current_hours_driven: driver.currentHoursDriven,
        current_on_duty_time: driver.currentOnDutyTime,
        current_hours_since_break: driver.currentHoursSinceBreak,
        cycle_hours_used: driver.cycleHoursUsed,
        external_driver_id: driver.externalDriverId,
        external_source: driver.externalSource,
        last_synced_at: driver.lastSyncedAt?.toISOString(),
        created_at: driver.createdAt.toISOString(),
        updated_at: driver.updatedAt.toISOString(),
        sally_access_status: sallyAccessStatus,
        linked_user_id: linkedUserId,
        pending_invitation_id: pendingInvitationId,
      };
    });
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new driver (basic info only)' })
  async createDriver(
    @CurrentUser() user: any,
    @Body() createDriverDto: CreateDriverDto,
  ) {
    const tenantDbId = await this.getTenantDbId(user);

    const driver = await this.driversService.create(tenantDbId, {
      name: createDriverDto.name,
      phone: createDriverDto.phone,
      email: createDriverDto.email,
      cdl_class: createDriverDto.cdl_class,
      license_number: createDriverDto.license_number,
      license_state: createDriverDto.license_state,
    });

    return {
      id: driver.id,
      driver_id: driver.driverId,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      cdl_class: driver.cdlClass,
      license_number: driver.licenseNumber,
      license_state: driver.licenseState,
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

    const driver = await this.driversService.update(driverId, tenantDbId, {
      name: updateDriverDto.name,
      phone: updateDriverDto.phone,
      email: updateDriverDto.email,
      cdl_class: updateDriverDto.cdl_class,
      license_number: updateDriverDto.license_number,
      license_state: updateDriverDto.license_state,
      endorsements: updateDriverDto.endorsements,
      hire_date: updateDriverDto.hire_date,
      medical_card_expiry: updateDriverDto.medical_card_expiry,
      home_terminal_city: updateDriverDto.home_terminal_city,
      home_terminal_state: updateDriverDto.home_terminal_state,
      emergency_contact_name: updateDriverDto.emergency_contact_name,
      emergency_contact_phone: updateDriverDto.emergency_contact_phone,
      notes: updateDriverDto.notes,
    });

    return {
      id: driver.id,
      driver_id: driver.driverId,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      cdl_class: driver.cdlClass,
      license_number: driver.licenseNumber,
      license_state: driver.licenseState,
      endorsements: driver.endorsements,
      hire_date: driver.hireDate,
      medical_card_expiry: driver.medicalCardExpiry,
      home_terminal_city: driver.homeTerminalCity,
      home_terminal_state: driver.homeTerminalState,
      emergency_contact_name: driver.emergencyContactName,
      emergency_contact_phone: driver.emergencyContactPhone,
      notes: driver.notes,
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

    // Derive SALLY access status
    let sallyAccessStatus: string = 'NO_ACCESS';
    let linkedUserId: string | null = null;
    let pendingInvitationId: string | null = null;

    if (driver.user) {
      linkedUserId = driver.user.userId;
      sallyAccessStatus = driver.user.isActive ? 'ACTIVE' : 'DEACTIVATED';
    } else if (driver.invitations?.length > 0) {
      sallyAccessStatus = 'INVITED';
      pendingInvitationId = driver.invitations[0].invitationId;
    }

    return {
      id: driver.id,
      driver_id: driver.driverId,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      cdl_class: driver.cdlClass,
      license_number: driver.licenseNumber,
      license_state: driver.licenseState,
      endorsements: driver.endorsements,
      status: driver.status,
      is_active: driver.isActive,
      hire_date: driver.hireDate,
      medical_card_expiry: driver.medicalCardExpiry,
      home_terminal_city: driver.homeTerminalCity,
      home_terminal_state: driver.homeTerminalState,
      home_terminal_timezone: driver.homeTerminalTimezone,
      emergency_contact_name: driver.emergencyContactName,
      emergency_contact_phone: driver.emergencyContactPhone,
      notes: driver.notes,
      // External sync
      external_driver_id: driver.externalDriverId,
      external_source: driver.externalSource,
      sync_status: driver.syncStatus,
      last_synced_at: driver.lastSyncedAt?.toISOString(),
      // HOS
      current_hours_driven: driver.currentHoursDriven,
      current_on_duty_time: driver.currentOnDutyTime,
      current_hours_since_break: driver.currentHoursSinceBreak,
      cycle_hours_used: driver.cycleHoursUsed,
      // Relations
      current_load: driver.loads?.[0] ? {
        load_id: driver.loads[0].loadId,
        reference_number: driver.loads[0].referenceNumber,
        status: driver.loads[0].status,
      } : null,
      sally_access_status: sallyAccessStatus,
      linked_user_id: linkedUserId,
      pending_invitation_id: pendingInvitationId,
      created_at: driver.createdAt.toISOString(),
      updated_at: driver.updatedAt.toISOString(),
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

  @Post(':driver_id/activate-and-invite')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Activate a driver and send SALLY invitation in one step',
  })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  async activateAndInvite(
    @Param('driver_id') driverId: string,
    @CurrentUser() user: any,
    @Body('email') email?: string,
  ) {
    const tenant = await this.getTenant(user.tenantId);

    return this.driversActivationService.activateAndInvite(driverId, email, {
      ...user,
      tenant: { id: tenant.id },
    });
  }
}
