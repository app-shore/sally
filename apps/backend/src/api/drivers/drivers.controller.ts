import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Drivers')
@Controller('drivers')
export class DriversController {
  private readonly logger = new Logger(DriversController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all active drivers (basic info only, HOS fetched from external API)' })
  async listDrivers() {
    this.logger.log('List drivers requested');

    try {
      const drivers = await this.prisma.driver.findMany({
        where: {
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
        created_at: driver.createdAt,
        updated_at: driver.updatedAt,
      }));
    } catch (error) {
      this.logger.error(`List drivers failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to fetch drivers' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
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
  async createDriver(@Body() body: { driver_id: string; name: string }) {
    this.logger.log(`Create driver: ${body.driver_id} - ${body.name}`);

    try {
      const driver = await this.prisma.driver.create({
        data: {
          driverId: body.driver_id,
          name: body.name,
          isActive: true,
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
  async updateDriver(@Param('driver_id') driverId: string, @Body() body: { name?: string }) {
    this.logger.log(`Update driver: ${driverId}`);

    try {
      const driver = await this.prisma.driver.update({
        where: { driverId },
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
      this.logger.error(`Update driver failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to update driver' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':driver_id')
  @ApiOperation({ summary: 'Soft delete driver (set isActive=false)' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  async deleteDriver(@Param('driver_id') driverId: string) {
    this.logger.log(`Delete driver: ${driverId}`);

    try {
      const driver = await this.prisma.driver.update({
        where: { driverId },
        data: { isActive: false },
      });

      return {
        driver_id: driver.driverId,
        message: 'Driver deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Delete driver failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to delete driver' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':driver_id/hos')
  @ApiOperation({ summary: 'Get driver HOS data from Samsara mock API' })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  async getDriverHOS(@Param('driver_id') driverId: string) {
    this.logger.log(`Get HOS data for driver: ${driverId}`);

    try {
      // Get basic driver info from database
      const driver = await this.prisma.driver.findUnique({
        where: { driverId },
      });

      if (!driver) {
        throw new HttpException({ detail: `Driver ${driverId} not found` }, HttpStatus.NOT_FOUND);
      }

      // In a real implementation, we would call the external Samsara API here
      // For POC, we return a reference to the mock API endpoint
      return {
        driver_id: driver.driverId,
        name: driver.name,
        message: `HOS data available at GET /external/hos/${driverId}`,
        note: 'Call the external mock API to get live HOS data',
      };
    } catch (error) {
      this.logger.error(`Get HOS failed: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException({ detail: 'Failed to fetch HOS data' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
