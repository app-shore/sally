import { Test, TestingModule } from '@nestjs/testing';
import { UserInvitationsService } from './user-invitations.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EmailService } from '../../../infrastructure/notification/services/email.service';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

describe('UserInvitationsService', () => {
  let service: UserInvitationsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    userInvitation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEmailService = {
    sendUserInvitation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserInvitationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<UserInvitationsService>(UserInvitationsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('inviteUser', () => {
    const defaultCurrentUser = {
      id: 1,
      userId: 'user_admin1',
      role: 'ADMIN',
      tenantId: 'tenant_abc',
      tenant: { id: 1 },
    };

    it('should create invitation for new user', async () => {
      const inviteDto = {
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'DISPATCHER' as any,
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 1, tenantId: 'tenant_abc' });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.userInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.userInvitation.create.mockResolvedValue({
        id: 1,
        invitationId: 'inv_abc123',
        email: inviteDto.email,
        status: 'PENDING',
        invitedByUser: { firstName: 'Admin', lastName: 'User' },
        tenant: { companyName: 'Fleet Co' },
      });

      const result = await service.inviteUser(inviteDto, defaultCurrentUser);

      expect(result.status).toBe('PENDING');
      expect(mockPrismaService.userInvitation.create).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const inviteDto = {
        email: 'existing@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'DISPATCHER' as any,
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 1, tenantId: 'tenant_abc' });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 1 });

      await expect(
        service.inviteUser(inviteDto, defaultCurrentUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should validate driver exists when driverId provided', async () => {
      const inviteDto = {
        email: 'driver@example.com',
        firstName: 'Mike',
        lastName: 'Driver',
        role: 'DRIVER' as any,
        driverId: 'driver_123',
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 1, tenantId: 'tenant_abc' });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.userInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.driver.findUnique.mockResolvedValue({
        id: 1,
        driverId: 'driver_123',
        tenantId: 1,
        user: null,
      });
      mockPrismaService.userInvitation.create.mockResolvedValue({
        id: 1,
        status: 'PENDING',
        invitedByUser: { firstName: 'Admin', lastName: 'User' },
        tenant: { companyName: 'Fleet Co' },
      });

      await service.inviteUser(inviteDto, defaultCurrentUser);

      expect(mockPrismaService.driver.findUnique).toHaveBeenCalledWith({
        where: { driverId: 'driver_123' },
        include: { user: true },
      });
    });
  });

  describe('acceptInvitation', () => {
    it('should accept valid invitation and create user', async () => {
      const token = 'valid-token';
      const firebaseUid = 'firebase-uid-123';

      const mockInvitation = {
        id: 1,
        invitationId: 'inv_abc',
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'DISPATCHER',
        tenantId: 1,
        driverId: null,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const mockUser = {
        id: 1,
        userId: 'user_abc123',
        email: mockInvitation.email,
      };

      mockPrismaService.userInvitation.findUnique.mockResolvedValue(
        mockInvitation,
      );
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.userInvitation.update.mockResolvedValue({
        ...mockInvitation,
        status: 'ACCEPTED',
      });

      const result = await service.acceptInvitation(token, firebaseUid);

      expect(result).toEqual(mockUser);
    });

    it('should throw error if invitation expired', async () => {
      mockPrismaService.userInvitation.findUnique.mockResolvedValue({
        id: 1,
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      await expect(
        service.acceptInvitation('token', 'firebase-uid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-activate PENDING_ACTIVATION driver when invitation accepted', async () => {
      const token = 'valid-token';
      const firebaseUid = 'firebase-uid-456';

      const mockInvitation = {
        id: 1,
        invitationId: 'inv_driver1',
        email: 'driver@example.com',
        firstName: 'Mike',
        lastName: 'Driver',
        role: 'DRIVER',
        tenantId: 1,
        driverId: 5,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const mockDriver = {
        id: 5,
        driverId: 'DRV-005',
        status: 'PENDING_ACTIVATION',
      };

      const mockUser = {
        id: 2,
        userId: 'user_driver1',
        email: mockInvitation.email,
        driverId: 5,
      };

      mockPrismaService.userInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.userInvitation.update.mockResolvedValue({
        ...mockInvitation,
        status: 'ACCEPTED',
      });
      mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.driver.update.mockResolvedValue({
        ...mockDriver,
        status: 'ACTIVE',
        isActive: true,
      });

      await service.acceptInvitation(token, firebaseUid);

      expect(mockPrismaService.driver.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({
            status: 'ACTIVE',
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('getInvitations', () => {
    it('should return invitations for tenant', async () => {
      const mockInvitations = [
        { id: 1, email: 'user1@example.com', status: 'PENDING' },
        { id: 2, email: 'user2@example.com', status: 'ACCEPTED' },
      ];

      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 1, tenantId: 'tenant_abc' });
      mockPrismaService.userInvitation.findMany.mockResolvedValue(
        mockInvitations,
      );

      const result = await service.getInvitations('tenant_abc');

      expect(result).toEqual(mockInvitations);
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel pending invitation', async () => {
      const mockInvitation = {
        id: 1,
        invitationId: 'inv_abc',
        tenantId: 1,
        status: 'PENDING',
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 1, tenantId: 'tenant_abc' });
      mockPrismaService.userInvitation.findUnique.mockResolvedValue(
        mockInvitation,
      );
      mockPrismaService.userInvitation.update.mockResolvedValue({
        ...mockInvitation,
        status: 'CANCELLED',
      });

      const result = await service.cancelInvitation(
        'inv_abc',
        'tenant_abc',
        'No longer needed',
      );

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw error if invitation already accepted', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 1, tenantId: 'tenant_abc' });
      mockPrismaService.userInvitation.findUnique.mockResolvedValue({
        id: 1,
        tenantId: 1,
        status: 'ACCEPTED',
      });

      await expect(
        service.cancelInvitation('inv_abc', 'tenant_abc', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendInvitation', () => {
    it('should generate new token and reset expiry for pending invitation', async () => {
      const mockInvitation = {
        id: 1,
        invitationId: 'inv_abc',
        tenantId: 1,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        tenant: { companyName: 'Fleet Co' },
        invitedByUser: { firstName: 'Admin', lastName: 'User' },
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 1, tenantId: 'tenant_abc' });
      mockPrismaService.userInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockPrismaService.userInvitation.update.mockResolvedValue({
        ...mockInvitation,
        token: 'new-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const result = await service.resendInvitation('inv_abc', 'tenant_abc');

      expect(mockPrismaService.userInvitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { invitationId: 'inv_abc' },
          data: expect.objectContaining({
            token: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw error if invitation is not PENDING', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 1, tenantId: 'tenant_abc' });
      mockPrismaService.userInvitation.findUnique.mockResolvedValue({
        id: 1,
        invitationId: 'inv_abc',
        tenantId: 1,
        status: 'ACCEPTED',
      });

      await expect(
        service.resendInvitation('inv_abc', 'tenant_abc'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if invitation not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 1, tenantId: 'tenant_abc' });
      mockPrismaService.userInvitation.findUnique.mockResolvedValue(null);

      await expect(
        service.resendInvitation('inv_nonexistent', 'tenant_abc'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
