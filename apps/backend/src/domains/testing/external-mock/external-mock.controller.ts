import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../../auth/decorators/public.decorator';
import { MOCK_TMS_VEHICLES, MOCK_TMS_DRIVERS } from './__tests__/mock-tms.data';

interface HOSData {
  driver_id: string;
  hours_driven: number;
  on_duty_time: number;
  hours_since_break: number;
  duty_status: string;
  last_updated: string;
  data_source: string;
}

interface FuelStation {
  name: string;
  address: string;
  price_per_gallon: number;
  distance_miles: number;
  amenities: string[];
}

interface WeatherData {
  conditions: string;
  temperature_f: number;
  wind_speed_mph: number;
  road_conditions: string;
  alerts: string[];
  data_source: string;
}

@ApiTags('External API Mock')
@Controller('external')
export class ExternalMockController {
  private readonly logger = new Logger(ExternalMockController.name);

  // Mock HOS data for different drivers
  private readonly mockHOSData: Record<string, HOSData> = {
    'DRV-001': {
      driver_id: 'DRV-001',
      hours_driven: 5.5,
      on_duty_time: 8.2,
      hours_since_break: 4.5,
      duty_status: 'on_duty_driving',
      last_updated: new Date().toISOString(),
      data_source: 'Samsara ELD (Mock)',
    },
    'DRV-002': {
      driver_id: 'DRV-002',
      hours_driven: 10.5,
      on_duty_time: 13.5,
      hours_since_break: 7.8,
      duty_status: 'on_duty_driving',
      last_updated: new Date().toISOString(),
      data_source: 'Samsara ELD (Mock)',
    },
    'DRV-003': {
      driver_id: 'DRV-003',
      hours_driven: 0.0,
      on_duty_time: 0.0,
      hours_since_break: 0.0,
      duty_status: 'off_duty',
      last_updated: new Date().toISOString(),
      data_source: 'Samsara ELD (Mock)',
    },
    'DRV-004': {
      driver_id: 'DRV-004',
      hours_driven: 8.0,
      on_duty_time: 11.0,
      hours_since_break: 6.5,
      duty_status: 'on_duty_driving',
      last_updated: new Date().toISOString(),
      data_source: 'Samsara ELD (Mock)',
    },
    'DRV-005': {
      driver_id: 'DRV-005',
      hours_driven: 3.0,
      on_duty_time: 5.0,
      hours_since_break: 3.0,
      duty_status: 'on_duty_driving',
      last_updated: new Date().toISOString(),
      data_source: 'Samsara ELD (Mock)',
    },
    'DRV-006': {
      driver_id: 'DRV-006',
      hours_driven: 0.0,
      on_duty_time: 0.0,
      hours_since_break: 0.0,
      duty_status: 'off_duty',
      last_updated: new Date().toISOString(),
      data_source: 'Samsara ELD (Mock)',
    },
    'DRV-007': {
      driver_id: 'DRV-007',
      hours_driven: 7.0,
      on_duty_time: 10.0,
      hours_since_break: 5.5,
      duty_status: 'on_duty_driving',
      last_updated: new Date().toISOString(),
      data_source: 'Samsara ELD (Mock)',
    },
    'DRV-008': {
      driver_id: 'DRV-008',
      hours_driven: 2.0,
      on_duty_time: 3.0,
      hours_since_break: 2.0,
      duty_status: 'on_duty_driving',
      last_updated: new Date().toISOString(),
      data_source: 'Samsara ELD (Mock)',
    },
  };

  @Public()
  @Get('hos/:driverId')
  @ApiOperation({ summary: 'Get driver HOS data from mock Samsara ELD API' })
  @ApiParam({ name: 'driverId', description: 'Driver ID (e.g., DRV-001)' })
  async getDriverHOS(@Param('driverId') driverId: string) {
    this.logger.log(`Mock HOS data requested for driver: ${driverId}`);

    // Simulate API latency (100-150ms)
    await this.simulateLatency();

    const hosData = this.mockHOSData[driverId];
    if (!hosData) {
      throw new HttpException(
        { detail: `Driver ${driverId} not found in mock Samsara system` },
        HttpStatus.NOT_FOUND,
      );
    }

    return hosData;
  }

  @Public()
  @Get('fuel-prices')
  @ApiOperation({ summary: 'Get fuel prices from mock GasBuddy API' })
  @ApiQuery({ name: 'lat', required: true, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: true, description: 'Longitude' })
  @ApiQuery({
    name: 'radius',
    required: false,
    description: 'Search radius in miles (default: 25)',
  })
  async getFuelPrices(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('radius') radius?: string,
  ) {
    this.logger.log(
      `Mock fuel prices requested for lat=${lat}, lon=${lon}, radius=${radius || 25}`,
    );

    // Simulate API latency
    await this.simulateLatency();

    // Return mock fuel stations
    const stations: FuelStation[] = [
      {
        name: 'Pilot Travel Center',
        address: 'Exit 45, I-35 South',
        price_per_gallon: 3.45,
        distance_miles: 12.3,
        amenities: ['truck_parking', 'showers', 'restaurant'],
      },
      {
        name: "Love's Travel Stop",
        address: 'Exit 52, I-35 South',
        price_per_gallon: 3.42,
        distance_miles: 18.7,
        amenities: ['truck_parking', 'showers', 'restaurant', 'wifi'],
      },
      {
        name: 'TA Petro',
        address: 'Exit 38, I-35 South',
        price_per_gallon: 3.48,
        distance_miles: 8.5,
        amenities: ['truck_parking', 'showers'],
      },
    ];

    return {
      stations,
      data_source: 'GasBuddy API (Mock)',
      search_location: { lat: parseFloat(lat), lon: parseFloat(lon) },
      search_radius_miles: parseInt(radius || '25', 10),
    };
  }

  @Public()
  @Get('weather')
  @ApiOperation({ summary: 'Get weather data from mock OpenWeatherMap API' })
  @ApiQuery({ name: 'lat', required: true, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: true, description: 'Longitude' })
  async getWeather(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
  ): Promise<WeatherData> {
    this.logger.log(`Mock weather data requested for lat=${lat}, lon=${lon}`);

    // Simulate API latency
    await this.simulateLatency();

    return {
      conditions: 'clear',
      temperature_f: 72,
      wind_speed_mph: 8,
      road_conditions: 'good',
      alerts: [],
      data_source: 'OpenWeatherMap API (Mock)',
    };
  }

  @Public()
  @Get('tms/vehicles')
  @ApiOperation({ summary: 'Get vehicles from mock Project44 TMS API' })
  async getTmsVehicles() {
    this.logger.log('Mock TMS vehicles data requested');

    // Simulate API latency
    await this.simulateLatency();

    return {
      vehicles: MOCK_TMS_VEHICLES,
      data_source: 'Project44 TMS API (Mock)',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('tms/vehicles/:vehicleId')
  @ApiOperation({ summary: 'Get single vehicle from mock Project44 TMS API' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID (e.g., TMS-V001)' })
  async getTmsVehicle(@Param('vehicleId') vehicleId: string) {
    this.logger.log(`Mock TMS vehicle data requested for: ${vehicleId}`);

    // Simulate API latency
    await this.simulateLatency();

    const vehicle = MOCK_TMS_VEHICLES.find((v) => v.id === vehicleId);
    if (!vehicle) {
      throw new HttpException(
        { detail: `Vehicle ${vehicleId} not found in mock TMS system` },
        HttpStatus.NOT_FOUND,
      );
    }

    return vehicle;
  }

  @Public()
  @Get('tms/drivers')
  @ApiOperation({ summary: 'Get drivers from mock Project44 TMS API' })
  async getTmsDrivers() {
    this.logger.log('Mock TMS drivers data requested');

    // Simulate API latency
    await this.simulateLatency();

    return {
      drivers: MOCK_TMS_DRIVERS,
      data_source: 'Project44 TMS API (Mock)',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('tms/drivers/:driverId')
  @ApiOperation({ summary: 'Get single driver from mock Project44 TMS API' })
  @ApiParam({ name: 'driverId', description: 'Driver ID (e.g., TMS-D001)' })
  async getTmsDriver(@Param('driverId') driverId: string) {
    this.logger.log(`Mock TMS driver data requested for: ${driverId}`);

    // Simulate API latency
    await this.simulateLatency();

    const driver = MOCK_TMS_DRIVERS.find((d) => d.id === driverId);
    if (!driver) {
      throw new HttpException(
        { detail: `Driver ${driverId} not found in mock TMS system` },
        HttpStatus.NOT_FOUND,
      );
    }

    return driver;
  }

  private async simulateLatency(): Promise<void> {
    // Simulate 100-150ms API latency
    const latency = 100 + Math.random() * 50;
    return new Promise((resolve) => setTimeout(resolve, latency));
  }
}
