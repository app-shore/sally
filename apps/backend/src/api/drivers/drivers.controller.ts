import { Controller, Get, Query, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Drivers')
@Controller('drivers')
export class DriversController {
  private readonly logger = new Logger(DriversController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all active drivers' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by duty status' })
  async listDrivers(@Query('status') status?: string) {
    this.logger.log(`List drivers requested, status filter: ${status}`);

    try {
      const drivers = await this.prisma.driver.findMany({
        where: {
          isActive: true,
          ...(status ? { currentDutyStatus: status } : {}),
        },
        orderBy: { driverId: 'asc' },
      });

      return drivers.map((driver) => ({
        id: driver.id,
        driver_id: driver.driverId,
        name: driver.name,
        hours_driven_today: driver.hoursDrivenToday,
        on_duty_time_today: driver.onDutyTimeToday,
        hours_since_break: driver.hoursSinceBreak,
        current_duty_status: driver.currentDutyStatus,
      }));
    } catch (error) {
      this.logger.error(`List drivers failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to fetch drivers' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
