import { Controller, Get, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
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
}
