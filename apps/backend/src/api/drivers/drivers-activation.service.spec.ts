import { Test, TestingModule } from '@nestjs/testing';
import { DriversActivationService } from './drivers-activation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DriversActivationService', () => {
  let service: DriversActivationService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    driver: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversActivationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DriversActivationService>(DriversActivationService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('activateDriver', () => {
    it('should activate pending driver', async () => {
      const mockDriver = {
        id: 1,
        driverId: 'driver_123',
        tenantId: 1,
        status: 'PENDING_ACTIVATION',
        isActive: false,
      };

      const currentUser = { id: 1, tenant: { id: 1 } };

      mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.driver.update.mockResolvedValue({
        ...mockDriver,
        status: 'ACTIVE',
        isActive: true,
        activatedAt: new Date(),
        activatedBy: currentUser.id,
      });

      const result = await service.activateDriver('driver_123', currentUser);

      expect(result.status).toBe('ACTIVE');
      expect(result.isActive).toBe(true);
    });

    it('should throw error if driver not found', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue(null);

      await expect(
        service.activateDriver('driver_999', { id: 1, tenant: { id: 1 } }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if driver already active', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({
        id: 1,
        status: 'ACTIVE',
        tenantId: 1,
      });

      await expect(
        service.activateDriver('driver_123', { id: 1, tenant: { id: 1 } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if driver from different tenant', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({
        id: 1,
        status: 'PENDING_ACTIVATION',
        tenantId: 2, // Different tenant
      });

      await expect(
        service.activateDriver('driver_123', { id: 1, tenant: { id: 1 } }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingDrivers', () => {
    it('should return pending drivers for tenant', async () => {
      const mockDrivers = [
        { id: 1, driverId: 'driver_1', status: 'PENDING_ACTIVATION' },
        { id: 2, driverId: 'driver_2', status: 'PENDING_ACTIVATION' },
      ];

      mockPrismaService.driver.findMany.mockResolvedValue(mockDrivers);

      const result = await service.getPendingDrivers(1);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.driver.findMany).toHaveBeenCalledWith({
        where: { tenantId: 1, status: 'PENDING_ACTIVATION' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
