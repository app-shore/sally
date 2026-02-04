import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';

/**
 * Mock TMS API Controller
 *
 * Simulates project44 TMS API responses for development/testing
 * Returns mock vehicle and driver data that matches Samsara ELD data
 *
 * Usage:
 * 1. Configure PROJECT44_TMS integration with any clientId/clientSecret
 * 2. Update the mock data below to match your actual Samsara fleet
 * 3. Sync will fetch from this mock endpoint instead of real project44 API
 */
@Controller('mock/tms')
export class MockTmsController {
  /**
   * Mock TMS vehicles endpoint
   * GET /mock/tms/api/vehicles
   *
   * Returns vehicles that should match your Samsara fleet by VIN/license plate
   */
  @Get('api/vehicles')
  async getVehicles(@Headers('authorization') auth: string) {
    // Simple auth check - just verify Bearer token exists
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Return mock TMS vehicle data
    // UPDATE THIS to match your actual Samsara fleet VINs and license plates
    return [
      {
        id: 'tms_vehicle_001',
        unitNumber: 'TRUCK-101',
        make: 'Freightliner',
        model: 'Cascadia',
        year: 2023,
        vin: '1FUJGBDV2KLBP7528',  // Replace with actual VIN from Samsara
        licensePlate: 'CA-ABC123',  // Replace with actual plate from Samsara
      },
      {
        id: 'tms_vehicle_002',
        unitNumber: 'TRUCK-102',
        make: 'Volvo',
        model: 'VNL',
        year: 2022,
        vin: '4V4NC9TH0KN123456',  // Replace with actual VIN from Samsara
        licensePlate: 'CA-XYZ789',  // Replace with actual plate from Samsara
      },
    ];
  }

  /**
   * Mock TMS drivers endpoint
   * GET /mock/tms/api/drivers
   *
   * Returns drivers that should match your Samsara fleet by phone/license
   */
  @Get('api/drivers')
  async getDrivers(@Headers('authorization') auth: string) {
    // Simple auth check
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Return mock TMS driver data
    // UPDATE THIS to match your actual Samsara fleet phone numbers and licenses
    return [
      {
        id: 'tms_driver_001',
        name: 'John Smith',
        phone: '+15551234567',  // Replace with actual phone from Samsara
        email: 'john.smith@example.com',
        licenseNumber: 'D1234567',  // Replace with actual license from Samsara
        licenseState: 'CA',
      },
      {
        id: 'tms_driver_002',
        name: 'Jane Doe',
        phone: '+15559876543',  // Replace with actual phone from Samsara
        email: 'jane.doe@example.com',
        licenseNumber: 'D9876543',  // Replace with actual license from Samsara
        licenseState: 'TX',
      },
    ];
  }
}
