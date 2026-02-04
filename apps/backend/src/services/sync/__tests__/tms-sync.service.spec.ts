import { Test, TestingModule } from '@nestjs/testing';
import { TmsSyncService } from '../tms-sync.service';
import { PrismaService } from '../../../prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TmsSyncService', () => {
  let service: TmsSyncService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TmsSyncService,
        {
          provide: PrismaService,
          useValue: {
            vehicle: {
              upsert: jest.fn(),
            },
            driver: {
              upsert: jest.fn(),
            },
            integrationConfig: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TmsSyncService>(TmsSyncService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncVehicles', () => {
    it('should fetch and upsert vehicles from TMS', async () => {
      const mockTmsVehicles = [
        {
          id: 'TMS-V001',
          unitNumber: 'UNIT-001',
          make: 'FREIGHTLINER',
          model: 'CASCADIA',
          year: 2018,
          vin: '1FUJGHDV9JLJY8062',
          licensePlate: 'TX R70-1836',
          status: 'ACTIVE',
        },
      ];

      const mockIntegration = {
        id: 1,
        tenantId: 1,
        vendor: 'PROJECT44_TMS',
        credentials: { apiKey: 'test-key', baseUrl: 'https://tms.example.com' },
      };

      jest
        .spyOn(prisma.integrationConfig, 'findUnique')
        .mockResolvedValue(mockIntegration as any);
      mockedAxios.get.mockResolvedValue({ data: mockTmsVehicles });
      jest.spyOn(prisma.vehicle, 'upsert').mockResolvedValue({} as any);

      await service.syncVehicles(1);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://tms.example.com/api/vehicles',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-key' },
        }),
      );

      expect(prisma.vehicle.upsert).toHaveBeenCalledWith({
        where: {
          externalVehicleId_tenantId: {
            externalVehicleId: 'TMS-V001',
            tenantId: 1,
          },
        },
        update: expect.objectContaining({
          make: 'FREIGHTLINER',
          model: 'CASCADIA',
        }),
        create: expect.objectContaining({
          externalVehicleId: 'TMS-V001',
          vehicleId: expect.any(String),
          unitNumber: 'UNIT-001',
          make: 'FREIGHTLINER',
        }),
      });
    });
  });

  describe('syncDrivers', () => {
    it('should fetch and upsert drivers from TMS', async () => {
      const mockTmsDrivers = [
        {
          id: 'TMS-D001',
          name: 'John Smith',
          phone: '+19788856169',
          licenseNumber: 'NHL14227039',
          licenseState: 'NH',
          status: 'ACTIVE',
        },
      ];

      const mockIntegration = {
        id: 1,
        tenantId: 1,
        vendor: 'PROJECT44_TMS',
        credentials: { apiKey: 'test-key', baseUrl: 'https://tms.example.com' },
      };

      jest
        .spyOn(prisma.integrationConfig, 'findUnique')
        .mockResolvedValue(mockIntegration as any);
      mockedAxios.get.mockResolvedValue({ data: mockTmsDrivers });
      jest.spyOn(prisma.driver, 'upsert').mockResolvedValue({} as any);

      await service.syncDrivers(1);

      expect(prisma.driver.upsert).toHaveBeenCalledWith({
        where: {
          driverId_tenantId: {
            driverId: expect.any(String),
            tenantId: 1,
          },
        },
        update: expect.objectContaining({
          name: 'John Smith',
        }),
        create: expect.objectContaining({
          externalDriverId: 'TMS-D001',
          driverId: expect.any(String),
          name: 'John Smith',
        }),
      });
    });
  });
});
