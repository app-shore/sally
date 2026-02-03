import { Test, TestingModule } from '@nestjs/testing';
import { EldSyncService } from '../eld-sync.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { VehicleMatcher } from '../matching/vehicle-matcher';
import { DriverMatcher } from '../matching/driver-matcher';
import { VehicleMerger } from '../merging/vehicle-merger';
import { DriverMerger } from '../merging/driver-merger';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EldSyncService', () => {
  let service: EldSyncService;
  let prisma: PrismaService;
  let vehicleMatcher: VehicleMatcher;
  let vehicleMerger: VehicleMerger;
  let driverMatcher: DriverMatcher;
  let driverMerger: DriverMerger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EldSyncService,
        {
          provide: PrismaService,
          useValue: {
            vehicle: { update: jest.fn() },
            driver: { update: jest.fn() },
            integrationConfig: { findUnique: jest.fn(), update: jest.fn() },
          },
        },
        {
          provide: VehicleMatcher,
          useValue: { match: jest.fn() },
        },
        {
          provide: DriverMatcher,
          useValue: { match: jest.fn() },
        },
        {
          provide: VehicleMerger,
          useValue: { merge: jest.fn() },
        },
        {
          provide: DriverMerger,
          useValue: { merge: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<EldSyncService>(EldSyncService);
    prisma = module.get<PrismaService>(PrismaService);
    vehicleMatcher = module.get<VehicleMatcher>(VehicleMatcher);
    vehicleMerger = module.get<VehicleMerger>(VehicleMerger);
    driverMatcher = module.get<DriverMatcher>(DriverMatcher);
    driverMerger = module.get<DriverMerger>(DriverMerger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncVehicles', () => {
    it('should match ELD vehicles to existing DB vehicles and merge data', async () => {
      const mockEldVehicles = [
        {
          id: '281474996387574',
          vin: '1FUJGHDV9JLJY8062',
          make: 'FREIGHTLINER',
          serial: 'G97TEAX5GM',
        },
      ];

      const mockDbVehicle = {
        id: 1,
        externalVehicleId: 'TMS-V001',
        vin: '1FUJGHDV9JLJY8062',
        make: 'FREIGHTLINER',
        tenantId: 1,
      };

      const mockMergedData = {
        make: 'FREIGHTLINER',
        eldTelematicsMetadata: { eldId: '281474996387574', serial: 'G97TEAX5GM' },
      };

      const mockIntegration = {
        id: 1,
        tenantId: 1,
        vendor: 'SAMSARA_ELD',
        credentials: { apiKey: 'test-key' },
      };

      jest.spyOn(prisma.integrationConfig, 'findUnique').mockResolvedValue(mockIntegration as any);
      mockedAxios.get.mockResolvedValue({ data: { data: mockEldVehicles } });
      jest.spyOn(vehicleMatcher, 'match').mockResolvedValue(mockDbVehicle as any);
      jest.spyOn(vehicleMerger, 'merge').mockReturnValue(mockMergedData as any);
      jest.spyOn(prisma.vehicle, 'update').mockResolvedValue({} as any);

      await service.syncVehicles(1);

      expect(vehicleMatcher.match).toHaveBeenCalledWith(1, {
        vin: '1FUJGHDV9JLJY8062',
      });

      expect(vehicleMerger.merge).toHaveBeenCalledWith(
        mockDbVehicle,
        expect.objectContaining({ eldId: '281474996387574' })
      );

      expect(prisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          eldTelematicsMetadata: mockMergedData.eldTelematicsMetadata,
        },
      });
    });

    it('should log warning for unmatched vehicles', async () => {
      const mockEldVehicles = [
        {
          id: '281474996387574',
          vin: 'UNKNOWN-VIN',
        },
      ];

      const mockIntegration = {
        id: 1,
        tenantId: 1,
        vendor: 'SAMSARA_ELD',
        credentials: { apiKey: 'test-key' },
      };

      jest.spyOn(prisma.integrationConfig, 'findUnique').mockResolvedValue(mockIntegration as any);
      mockedAxios.get.mockResolvedValue({ data: { data: mockEldVehicles } });
      jest.spyOn(vehicleMatcher, 'match').mockResolvedValue(null);

      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.syncVehicles(1);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('No matching vehicle found')
      );
    });
  });

  describe('syncDrivers', () => {
    it('should match ELD drivers to existing DB drivers and merge data', async () => {
      const mockEldDrivers = [
        {
          id: '53207939',
          phone: '+19788856169',
          username: 'Oscar',
        },
      ];

      const mockDbDriver = {
        id: 1,
        externalDriverId: 'TMS-D001',
        phone: '+19788856169',
        tenantId: 1,
      };

      const mockMergedData = {
        phone: '+19788856169',
        eldMetadata: { eldId: '53207939', username: 'Oscar' },
      };

      const mockIntegration = {
        id: 1,
        tenantId: 1,
        vendor: 'SAMSARA_ELD',
        credentials: { apiKey: 'test-key' },
      };

      jest.spyOn(prisma.integrationConfig, 'findUnique').mockResolvedValue(mockIntegration as any);
      mockedAxios.get.mockResolvedValue({ data: { data: mockEldDrivers } });
      jest.spyOn(driverMatcher, 'match').mockResolvedValue(mockDbDriver as any);
      jest.spyOn(driverMerger, 'merge').mockReturnValue(mockMergedData as any);
      jest.spyOn(prisma.driver, 'update').mockResolvedValue({} as any);

      await service.syncDrivers(1);

      expect(driverMatcher.match).toHaveBeenCalledWith(1, {
        phone: '+19788856169',
      });

      expect(prisma.driver.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          eldMetadata: mockMergedData.eldMetadata,
        },
      });
    });
  });
});
