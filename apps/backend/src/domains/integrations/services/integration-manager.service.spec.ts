import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationManagerService } from './integration-manager.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { RetryService } from '../../../infrastructure/retry/retry.service';
import { AlertService } from '../../operations/alerts/services/alert.service';
import { SamsaraELDAdapter } from '../adapters/eld/samsara-eld.adapter';
import { McLeodTMSAdapter } from '../adapters/tms/mcleod-tms.adapter';
import { Project44TMSAdapter } from '../adapters/tms/project44-tms.adapter';
import { GasBuddyFuelAdapter } from '../adapters/fuel/gasbuddy-fuel.adapter';
import { OpenWeatherAdapter } from '../adapters/weather/openweather.adapter';

describe('IntegrationManagerService', () => {
  let service: IntegrationManagerService;

  const mockPrismaService = {
    driver: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    integrationConfig: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    integrationSyncLog: {
      create: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCredentialsService = {
    decrypt: jest.fn((value) => value),
  };

  const mockAlertService = {
    sendAlert: jest.fn(),
  };

  const mockSamsaraAdapter = {
    getVehicles: jest.fn(),
    getDrivers: jest.fn(),
    getHOSClocks: jest.fn(),
    getVehicleLocations: jest.fn(),
    getVehicleGPSSnapshots: jest.fn(),
    testConnection: jest.fn(),
  };

  const mockMcLeodAdapter = { testConnection: jest.fn() };
  const mockProject44Adapter = { testConnection: jest.fn() };
  const mockGasBuddyAdapter = { testConnection: jest.fn() };
  const mockOpenWeatherAdapter = { testConnection: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationManagerService,
        RetryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CredentialsService, useValue: mockCredentialsService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: SamsaraELDAdapter, useValue: mockSamsaraAdapter },
        { provide: McLeodTMSAdapter, useValue: mockMcLeodAdapter },
        { provide: Project44TMSAdapter, useValue: mockProject44Adapter },
        { provide: GasBuddyFuelAdapter, useValue: mockGasBuddyAdapter },
        { provide: OpenWeatherAdapter, useValue: mockOpenWeatherAdapter },
      ],
    }).compile();

    service = module.get<IntegrationManagerService>(IntegrationManagerService);
    jest.clearAllMocks();
  });

  describe('getDriverHOS', () => {
    it('should return manual override when present', async () => {
      const mockDriver = {
        id: 1,
        driverId: 'DRV-001',
        tenantId: 1,
        hosManualOverride: true,
        hosData: {
          driver_id: 'DRV-001',
          hours_driven: 8.5,
          duty_status: 'DRIVING',
          data_source: 'manual',
        },
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(mockDriver);

      const result = await service.getDriverHOS(1, 'DRV-001');

      expect(result).toMatchObject({
        driver_id: 'DRV-001',
        data_source: 'manual_override',
        cached: true,
      });
    });

    it('should return fresh cache when available', async () => {
      const mockDriver = {
        id: 1,
        driverId: 'DRV-001',
        tenantId: 1,
        hosManualOverride: null,
        hosData: {
          driver_id: 'DRV-001',
          hours_driven: 8.5,
          duty_status: 'DRIVING',
          data_source: 'samsara_eld',
        },
        hosDataSyncedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(mockDriver);

      const result = await service.getDriverHOS(1, 'DRV-001');

      expect(result).toMatchObject({
        driver_id: 'DRV-001',
        cached: true,
        cache_age_seconds: expect.any(Number),
      });
    });

    it('should fetch from Samsara HOS Clocks when cache is stale', async () => {
      const mockDriver = {
        id: 1,
        driverId: 'DRV-001',
        tenantId: 1,
        hosManualOverride: null,
        hosData: null,
        hosDataSyncedAt: null,
      };

      const mockIntegration = {
        id: 1,
        tenantId: 1,
        integrationType: 'HOS_ELD',
        status: 'ACTIVE',
        credentials: { apiToken: 'test-token' },
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(mockDriver);
      mockPrismaService.integrationConfig.findFirst.mockResolvedValue(mockIntegration);
      mockPrismaService.driver.update.mockResolvedValue(mockDriver);

      mockSamsaraAdapter.getHOSClocks.mockResolvedValue([
        {
          driverId: 'DRV-001',
          driverName: 'John Doe',
          currentDutyStatus: 'driving',
          driveTimeRemainingMs: 3600000,
          shiftTimeRemainingMs: 7200000,
          cycleTimeRemainingMs: 180000000,
          timeUntilBreakMs: 1800000,
          lastUpdated: new Date().toISOString(),
        },
      ]);

      const result = await service.getDriverHOS(1, 'DRV-001');

      expect(result).toMatchObject({
        data_source: 'samsara',
        cached: false,
        currentDutyStatus: 'driving',
        driveTimeRemainingMs: 3600000,
      });
      expect(mockSamsaraAdapter.getHOSClocks).toHaveBeenCalledWith('test-token');
    });

    it('should fall back to stale cache on failure', async () => {
      const oldDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const mockDriver = {
        id: 1,
        driverId: 'DRV-001',
        tenantId: 1,
        hosManualOverride: null,
        hosData: {
          driver_id: 'DRV-001',
          hours_driven: 8.5,
          duty_status: 'DRIVING',
          data_source: 'samsara_eld',
        },
        hosDataSyncedAt: oldDate,
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(mockDriver);
      mockPrismaService.integrationConfig.findFirst.mockResolvedValue({
        id: 1,
        tenantId: 1,
        integrationType: 'HOS_ELD',
        status: 'ACTIVE',
        credentials: { apiToken: 'test-token' },
      });
      mockSamsaraAdapter.getHOSClocks.mockRejectedValue(new Error('ETIMEDOUT'));

      const result = await service.getDriverHOS(1, 'DRV-001');

      expect(result).toMatchObject({
        driver_id: 'DRV-001',
        cached: true,
        stale: true,
        cache_age_seconds: expect.any(Number),
        error: expect.stringContaining('ETIMEDOUT'),
      });
    });

    it('should throw when no data available and fetch fails', async () => {
      const mockDriver = {
        id: 1,
        driverId: 'DRV-001',
        tenantId: 1,
        hosManualOverride: null,
        hosData: null,
        hosDataSyncedAt: null,
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(mockDriver);
      mockPrismaService.integrationConfig.findFirst.mockResolvedValue({
        id: 1,
        tenantId: 1,
        integrationType: 'HOS_ELD',
        status: 'ACTIVE',
        credentials: { apiToken: 'test-token' },
      });
      mockSamsaraAdapter.getHOSClocks.mockRejectedValue(new Error('ETIMEDOUT'));

      await expect(service.getDriverHOS(1, 'DRV-001')).rejects.toThrow(
        'No HOS data available for driver DRV-001',
      );
    });
  });

  describe('getVehicleLocation', () => {
    it('should fetch vehicle GPS via Samsara adapter', async () => {
      mockPrismaService.integrationConfig.findFirst.mockResolvedValue({
        id: 1,
        tenantId: 1,
        integrationType: 'HOS_ELD',
        status: 'ACTIVE',
        credentials: { apiToken: 'test-token' },
      });

      mockSamsaraAdapter.getVehicleGPSSnapshots.mockResolvedValue([
        {
          vehicleId: 'veh-456',
          gps: { latitude: 34.05, longitude: -118.24, speedMilesPerHour: 65, headingDegrees: 270, time: '2026-02-09T12:00:00Z' },
        },
      ]);

      const result = await service.getVehicleLocation(1, 'veh-456');

      expect(result).toBeDefined();
      expect(result.gps.latitude).toBe(34.05);
    });

    it('should throw if no active integration', async () => {
      mockPrismaService.integrationConfig.findFirst.mockResolvedValue(null);

      await expect(service.getVehicleLocation(1, 'veh-456')).rejects.toThrow(
        'No active HOS integration',
      );
    });

    it('should throw if vehicle not found', async () => {
      mockPrismaService.integrationConfig.findFirst.mockResolvedValue({
        id: 1,
        tenantId: 1,
        integrationType: 'HOS_ELD',
        status: 'ACTIVE',
        credentials: { apiToken: 'test-token' },
      });

      mockSamsaraAdapter.getVehicleGPSSnapshots.mockResolvedValue([
        {
          vehicleId: 'veh-other',
          gps: { latitude: 34.05, longitude: -118.24, speedMilesPerHour: 65, headingDegrees: 270, time: '2026-02-09T12:00:00Z' },
        },
      ]);

      await expect(service.getVehicleLocation(1, 'veh-456')).rejects.toThrow(
        'Vehicle veh-456 not found',
      );
    });
  });
});
