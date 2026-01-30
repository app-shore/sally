import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationManagerService } from './integration-manager.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { RetryService } from '../retry/retry.service';
import { SamsaraHOSAdapter } from '../adapters/hos/samsara-hos.adapter';
import { McLeodTMSAdapter } from '../adapters/tms/mcleod-tms.adapter';
import { TruckbaseTMSAdapter } from '../adapters/tms/truckbase-tms.adapter';
import { GasBuddyFuelAdapter } from '../adapters/fuel/gasbuddy-fuel.adapter';
import { FuelFinderAdapter } from '../adapters/fuel/fuelfinder-fuel.adapter';
import { OpenWeatherAdapter } from '../adapters/weather/openweather.adapter';
import { HOSData } from '../adapters/hos/hos-adapter.interface';

describe('IntegrationManagerService', () => {
  let service: IntegrationManagerService;
  let prisma: PrismaService;
  let samsaraAdapter: SamsaraHOSAdapter;
  let retryService: RetryService;

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
  };

  const mockCredentialsService = {
    decrypt: jest.fn((value) => value),
  };

  const mockSamsaraAdapter = {
    getDriverHOS: jest.fn(),
    testConnection: jest.fn(),
  };

  const mockMcLeodAdapter = {
    testConnection: jest.fn(),
  };

  const mockTruckbaseAdapter = {
    testConnection: jest.fn(),
  };

  const mockGasBuddyAdapter = {
    testConnection: jest.fn(),
  };

  const mockFuelFinderAdapter = {
    testConnection: jest.fn(),
  };

  const mockOpenWeatherAdapter = {
    testConnection: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationManagerService,
        RetryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CredentialsService,
          useValue: mockCredentialsService,
        },
        {
          provide: SamsaraHOSAdapter,
          useValue: mockSamsaraAdapter,
        },
        {
          provide: McLeodTMSAdapter,
          useValue: mockMcLeodAdapter,
        },
        {
          provide: TruckbaseTMSAdapter,
          useValue: mockTruckbaseAdapter,
        },
        {
          provide: GasBuddyFuelAdapter,
          useValue: mockGasBuddyAdapter,
        },
        {
          provide: FuelFinderAdapter,
          useValue: mockFuelFinderAdapter,
        },
        {
          provide: OpenWeatherAdapter,
          useValue: mockOpenWeatherAdapter,
        },
      ],
    }).compile();

    service = module.get<IntegrationManagerService>(IntegrationManagerService);
    prisma = module.get<PrismaService>(PrismaService);
    samsaraAdapter = module.get<SamsaraHOSAdapter>(SamsaraHOSAdapter);
    retryService = module.get<RetryService>(RetryService);

    // Reset mocks
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

    it('should retry on network failure', async () => {
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
        integrationId: 'int-001',
        tenantId: 1,
        integrationType: 'HOS_ELD',
        vendor: 'SAMSARA_ELD',
        status: 'ACTIVE',
        credentials: { apiKey: 'test-key' },
      };

      const mockHOSData: HOSData = {
        driver_id: 'DRV-001',
        hours_driven: 8.5,
        on_duty_time: 10.0,
        hours_since_break: 4.0,
        duty_status: 'DRIVING',
        last_updated: new Date().toISOString(),
        data_source: 'samsara_eld',
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(mockDriver);
      mockPrismaService.integrationConfig.findFirst.mockResolvedValue(mockIntegration);
      mockPrismaService.driver.update.mockResolvedValue(mockDriver);

      let attempts = 0;
      mockSamsaraAdapter.getDriverHOS.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('ECONNRESET');
        }
        return Promise.resolve(mockHOSData);
      });

      const result = await service.getDriverHOS(1, 'DRV-001');

      expect(result).toBeDefined();
      expect(result.driver_id).toBe('DRV-001');
      expect(attempts).toBe(3);
      expect(mockPrismaService.driver.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          hosData: mockHOSData,
          hosDataSyncedAt: expect.any(Date),
          hosDataSource: 'samsara_eld',
          lastSyncedAt: expect.any(Date),
        },
      });
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

      const mockIntegration = {
        id: 1,
        integrationId: 'int-001',
        tenantId: 1,
        integrationType: 'HOS_ELD',
        vendor: 'SAMSARA_ELD',
        status: 'ACTIVE',
        credentials: { apiKey: 'test-key' },
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(mockDriver);
      mockPrismaService.integrationConfig.findFirst.mockResolvedValue(mockIntegration);
      mockSamsaraAdapter.getDriverHOS.mockRejectedValue(new Error('ETIMEDOUT'));

      const result = await service.getDriverHOS(1, 'DRV-001');

      expect(result).toMatchObject({
        driver_id: 'DRV-001',
        cached: true,
        stale: true,
        cache_age_seconds: expect.any(Number),
        error: 'ETIMEDOUT',
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

      const mockIntegration = {
        id: 1,
        integrationId: 'int-001',
        tenantId: 1,
        integrationType: 'HOS_ELD',
        vendor: 'SAMSARA_ELD',
        status: 'ACTIVE',
        credentials: { apiKey: 'test-key' },
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(mockDriver);
      mockPrismaService.integrationConfig.findFirst.mockResolvedValue(mockIntegration);
      mockSamsaraAdapter.getDriverHOS.mockRejectedValue(new Error('ETIMEDOUT'));

      await expect(service.getDriverHOS(1, 'DRV-001')).rejects.toThrow(
        'No HOS data available for driver DRV-001',
      );
    });
  });
});
