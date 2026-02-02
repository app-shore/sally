import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpStatus, HttpException, Logger, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { IntegrationManagerService } from '../../services/integration-manager/integration-manager.service';
import { DriversActivationService } from './drivers-activation.service';

@ApiTags('Drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  private readonly logger = new Logger(DriversController.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IntegrationManagerService) private readonly integrationManager: IntegrationManagerService,
    private readonly driversActivationService: DriversActivationService,
  ) {}

  /**
   * Validate that a driver is not from an external source before allowing modification
   */
  private async validateNotExternal(
    driverId: string,
    tenantId: number,
    operation: string
  ) {
    const driver = await this.prisma.driver.findFirst({
      where: { driverId, tenantId },
    });

    if (!driver) {
      throw new HttpException(
        { detail: `Driver not found: ${driverId}` },
        HttpStatus.NOT_FOUND
      );
    }

    if (driver.externalSource) {
      throw new HttpException(
        {
          detail: `Cannot ${operation} driver from external source: ${driver.externalSource}. This is a read-only integration record.`,
          external_source: driver.externalSource
        },
        HttpStatus.FORBIDDEN
      );
    }
  }

  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'List all active drivers (basic info only, HOS fetched from external API)' })
  async listDrivers(@CurrentUser() user: any) {
    this.logger.log(`List drivers requested by user ${user.userId} in tenant ${user.tenantId}`);

    try {
      // Get tenant ID from authenticated user
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      const drivers = await this.prisma.driver.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
        },
        orderBy: { driverId: 'asc' },
      });

      // Return only basic driver info
      // HOS data (hours_driven, on_duty_time, etc.) should be fetched from /api/v1/external/hos/:driver_id
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
    } catch (error) {
      this.logger.error(`List drivers failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to fetch drivers' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new driver (basic info only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        driver_id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['driver_id', 'name'],
    },
  })
  async createDriver(@CurrentUser() user: any, @Body() body: { driver_id: string; name: string }) {
    this.logger.log(`Create driver: ${body.driver_id} - ${body.name} by user ${user.userId}`);

    try {
      // Get tenant ID from authenticated user
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      // NOTE: Manual drivers are immediately ACTIVE
      // Drivers synced from external sources (TMS/ELD) should be created with:
      //   status: 'PENDING_ACTIVATION', isActive: false, externalSource: 'SAMSARA'
      //   and require manual activation via /drivers/:id/activate endpoint
      const driver = await this.prisma.driver.create({
        data: {
          driverId: body.driver_id,
          name: body.name,
          status: 'ACTIVE',
          isActive: true,
          tenantId: tenant.id,
          syncStatus: 'MANUAL_ENTRY',
        },
      });

      return {
        id: driver.id,
        driver_id: driver.driverId,
        name: driver.name,
        is_active: driver.isActive,
        created_at: driver.createdAt,
        updated_at: driver.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Create driver failed: ${error.message}`);
      if (error.code === 'P2002') {
        throw new HttpException({ detail: 'Driver ID already exists' }, HttpStatus.CONFLICT);
      }
      throw new HttpException({ detail: 'Failed to create driver' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':driver_id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update driver basic info' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    },
  })
  async updateDriver(@CurrentUser() user: any, @Param('driver_id') driverId: string, @Body() body: { name?: string }) {
    this.logger.log(`Update driver: ${driverId} by user ${user.userId}`);

    try {
      // Get tenant ID from authenticated user
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      if (!tenant) {
        throw new HttpException({ detail: 'Tenant not found' }, HttpStatus.NOT_FOUND);
      }

      // Validate driver is not from external source
      await this.validateNotExternal(driverId, tenant.id, 'update');

      const driver = await this.prisma.driver.update({
        where: {
          driverId_tenantId: {
            driverId,
            tenantId: tenant.id,
          },
        },
        data: {
          ...(body.name ? { name: body.name } : {}),
        },
      });

      return {
        id: driver.id,
        driver_id: driver.driverId,
        name: driver.name,
        is_active: driver.isActive,
        updated_at: driver.updatedAt,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Update driver failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to update driver' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':driver_id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Soft delete driver (set isActive=false)' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  async deleteDriver(@CurrentUser() user: any, @Param('driver_id') driverId: string) {
    this.logger.log(`Delete driver: ${driverId} by user ${user.userId}`);

    try {
      // Get tenant ID from authenticated user
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      if (!tenant) {
        throw new HttpException({ detail: 'Tenant not found' }, HttpStatus.NOT_FOUND);
      }

      // Validate driver is not from external source
      await this.validateNotExternal(driverId, tenant.id, 'delete');

      const driver = await this.prisma.driver.update({
        where: {
          driverId_tenantId: {
            driverId,
            tenantId: tenant.id,
          },
        },
        data: { isActive: false },
      });

      return {
        driver_id: driver.driverId,
        message: 'Driver deactivated successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Delete driver failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to delete driver' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  @Get(':driver_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER, UserRole.DRIVER)
  @ApiOperation({ summary: 'Get driver by ID' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  @ApiResponse({
    status: 200,
    description: 'Driver details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        driver_id: { type: 'string' },
        name: { type: 'string' },
        is_active: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async getDriver(
    @Param('driver_id') driverId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Get driver requested: ${driverId}`);

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      if (!tenant) {
        throw new HttpException({ detail: 'Tenant not found' }, HttpStatus.NOT_FOUND);
      }

      const driver = await this.prisma.driver.findUnique({
        where: {
          driverId_tenantId: {
            driverId,
            tenantId: tenant.id,
          },
        },
      });

      if (!driver) {
        throw new HttpException({ detail: `Driver not found: ${driverId}` }, HttpStatus.NOT_FOUND);
      }

      return {
        id: driver.id,
        driver_id: driver.driverId,
        name: driver.name,
        is_active: driver.isActive,
        created_at: driver.createdAt,
        updated_at: driver.updatedAt,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Get driver failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to fetch driver' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':driverId/hos')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get live HOS data for driver from integration (with cache fallback)' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  async getDriverHOS(
    @Param('driverId') driverId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Fetch HOS for driver ${driverId} by user ${user.userId}`);

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      const hosData = await this.integrationManager.getDriverHOS(tenant.id, driverId);

      return hosData;
    } catch (error) {
      this.logger.error(`Get driver HOS failed: ${error.message}`);
      throw new HttpException(
        { detail: error.message || 'Failed to fetch driver HOS' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get pending drivers (ADMIN only)
   */
  @Get('pending/list')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get all pending drivers awaiting activation' })
  async getPendingDrivers(@CurrentUser() user: any) {
    this.logger.log(`Get pending drivers by user ${user.userId}`);

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      return this.driversActivationService.getPendingDrivers(tenant.id);
    } catch (error) {
      this.logger.error(`Get pending drivers failed: ${error.message}`);
      throw new HttpException(
        { detail: 'Failed to fetch pending drivers' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get inactive drivers (ADMIN only)
   */
  @Get('inactive/list')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get all inactive drivers' })
  async getInactiveDrivers(@CurrentUser() user: any) {
    this.logger.log(`Get inactive drivers by user ${user.userId}`);

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      return this.driversActivationService.getInactiveDrivers(tenant.id);
    } catch (error) {
      this.logger.error(`Get inactive drivers failed: ${error.message}`);
      throw new HttpException(
        { detail: 'Failed to fetch inactive drivers' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Activate a driver (ADMIN only)
   */
  @Post(':driver_id/activate')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Activate a pending driver' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  async activateDriver(
    @Param('driver_id') driverId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Activate driver ${driverId} by user ${user.userId}`);

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      return this.driversActivationService.activateDriver(driverId, {
        id: user.id,
        tenant: { id: tenant.id },
      });
    } catch (error) {
      this.logger.error(`Activate driver failed: ${error.message}`);
      throw new HttpException(
        { detail: error.message || 'Failed to activate driver' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Deactivate a driver (ADMIN only)
   */
  @Post(':driver_id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Deactivate an active driver' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
      },
      required: ['reason'],
    },
  })
  async deactivateDriver(
    @Param('driver_id') driverId: string,
    @CurrentUser() user: any,
    @Body('reason') reason: string,
  ) {
    this.logger.log(`Deactivate driver ${driverId} by user ${user.userId}`);

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      return this.driversActivationService.deactivateDriver(driverId, {
        id: user.id,
        tenant: { id: tenant.id },
      }, reason);
    } catch (error) {
      this.logger.error(`Deactivate driver failed: ${error.message}`);
      throw new HttpException(
        { detail: error.message || 'Failed to deactivate driver' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Reactivate a driver (ADMIN only)
   */
  @Post(':driver_id/reactivate')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Reactivate an inactive driver' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  async reactivateDriver(
    @Param('driver_id') driverId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Reactivate driver ${driverId} by user ${user.userId}`);

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
      });

      return this.driversActivationService.reactivateDriver(driverId, {
        id: user.id,
        tenant: { id: tenant.id },
      });
    } catch (error) {
      this.logger.error(`Reactivate driver failed: ${error.message}`);
      throw new HttpException(
        { detail: error.message || 'Failed to reactivate driver' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
