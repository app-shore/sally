import { Test, TestingModule } from '@nestjs/testing';
import { DriversActivationService } from './drivers-activation.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { UserInvitationsService } from '../../../platform/user-invitations/user-invitations.service';
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

  const mockUserInvitationsService = {
    inviteUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversActivationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UserInvitationsService,
          useValue: mockUserInvitationsService,
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

  describe('activateAndInvite', () => {
    it('should activate driver and create invitation in one step', async () => {
      const mockDriver = {
        id: 1,
        driverId: 'DRV-001',
        name: 'Mike Thompson',
        email: 'mike@email.com',
        tenantId: 1,
        status: 'PENDING_ACTIVATION',
        isActive: false,
        user: null,
      };

      const currentUser = {
        id: 10,
        userId: 'user_admin1',
        email: 'admin@fleet.com',
        role: 'ADMIN',
        tenantId: 'tenant_abc',
        tenant: { id: 1 },
      };

      mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.driver.update.mockResolvedValue({
        ...mockDriver,
        status: 'ACTIVE',
        isActive: true,
        activatedAt: new Date(),
        activatedBy: currentUser.id,
      });
      mockUserInvitationsService.inviteUser.mockResolvedValue({
        id: 1,
        invitationId: 'inv_abc123',
        email: 'mike@email.com',
        status: 'PENDING',
      });

      const result = await service.activateAndInvite('DRV-001', undefined, currentUser);

      expect(result.driver.status).toBe('ACTIVE');
      expect(result.invitation.status).toBe('PENDING');
      expect(mockUserInvitationsService.inviteUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'mike@email.com',
          firstName: 'Mike',
          lastName: 'Thompson',
          role: 'DRIVER',
          driverId: 'DRV-001',
        }),
        currentUser,
      );
    });

    it('should use provided email when driver has no email', async () => {
      const mockDriver = {
        id: 2,
        driverId: 'DRV-002',
        name: 'Dan Foster',
        email: null,
        tenantId: 1,
        status: 'PENDING_ACTIVATION',
        isActive: false,
        user: null,
      };

      const currentUser = {
        id: 10,
        userId: 'user_admin1',
        role: 'ADMIN',
        tenantId: 'tenant_abc',
        tenant: { id: 1 },
      };

      mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.driver.update.mockResolvedValue({
        ...mockDriver,
        email: 'dan@email.com',
        status: 'ACTIVE',
        isActive: true,
      });
      mockUserInvitationsService.inviteUser.mockResolvedValue({
        id: 2,
        status: 'PENDING',
      });

      await service.activateAndInvite('DRV-002', 'dan@email.com', currentUser);

      expect(mockPrismaService.driver.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'dan@email.com' }),
        }),
      );
    });

    it('should throw error when driver has no email and none provided', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({
        id: 3,
        driverId: 'DRV-003',
        name: 'No Email',
        email: null,
        tenantId: 1,
        status: 'PENDING_ACTIVATION',
        user: null,
      });

      await expect(
        service.activateAndInvite('DRV-003', undefined, { id: 10, tenant: { id: 1 } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should work for already-active drivers (invite only, no status change)', async () => {
      const mockDriver = {
        id: 4,
        driverId: 'DRV-004',
        name: 'Already Active',
        email: 'active@email.com',
        tenantId: 1,
        status: 'ACTIVE',
        isActive: true,
        user: null,
      };

      const currentUser = {
        id: 10,
        tenant: { id: 1 },
        tenantId: 'tenant_abc',
        role: 'ADMIN',
        userId: 'user_admin1',
      };

      mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
      mockUserInvitationsService.inviteUser.mockResolvedValue({
        id: 3,
        status: 'PENDING',
      });

      const result = await service.activateAndInvite('DRV-004', undefined, currentUser);

      expect(result.invitation.status).toBe('PENDING');
    });
  });
});
