import { Test, TestingModule } from '@nestjs/testing';
import { UserInvitationsService } from './user-invitations.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
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
      create: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserInvitationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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
    it('should create invitation for new user', async () => {
      const inviteDto = {
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'DISPATCHER' as any,
      };
      const currentUser = { id: 1, tenant: { id: 1 } };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.userInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.userInvitation.create.mockResolvedValue({
        id: 1,
        invitationId: 'inv_abc123',
        email: inviteDto.email,
        status: 'PENDING',
      });

      const result = await service.inviteUser(inviteDto, currentUser);

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

      mockPrismaService.user.findFirst.mockResolvedValue({ id: 1 });

      await expect(
        service.inviteUser(inviteDto, { id: 1, tenant: { id: 1 } }),
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
      });

      await service.inviteUser(inviteDto, { id: 1, tenant: { id: 1 } });

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
  });

  describe('getInvitations', () => {
    it('should return invitations for tenant', async () => {
      const mockInvitations = [
        { id: 1, email: 'user1@example.com', status: 'PENDING' },
        { id: 2, email: 'user2@example.com', status: 'ACCEPTED' },
      ];

      mockPrismaService.userInvitation.findMany.mockResolvedValue(
        mockInvitations,
      );

      const result = await service.getInvitations(1);

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

      mockPrismaService.userInvitation.findUnique.mockResolvedValue(
        mockInvitation,
      );
      mockPrismaService.userInvitation.update.mockResolvedValue({
        ...mockInvitation,
        status: 'CANCELLED',
      });

      const result = await service.cancelInvitation(
        'inv_abc',
        1,
        'No longer needed',
      );

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw error if invitation already accepted', async () => {
      mockPrismaService.userInvitation.findUnique.mockResolvedValue({
        id: 1,
        tenantId: 1,
        status: 'ACCEPTED',
      });

      await expect(
        service.cancelInvitation('inv_abc', 1, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
