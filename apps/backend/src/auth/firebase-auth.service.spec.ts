import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAuthService } from './firebase-auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FirebaseAuthService', () => {
  let service: FirebaseAuthService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseAuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FirebaseAuthService>(FirebaseAuthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyFirebaseToken', () => {
    // Note: These would require mocking Firebase Admin SDK
    // Integration tests would be more appropriate for Firebase token verification
    it.skip('should return decoded token for valid Firebase token', async () => {
      // Requires Firebase Admin SDK mock
    });

    it.skip('should throw error for invalid token', async () => {
      // Requires Firebase Admin SDK mock
    });
  });

  describe('findOrCreateUserByFirebaseUid', () => {
    it('should return existing user if found', async () => {
      const mockUser = {
        id: 1,
        userId: 'user_001',
        firebaseUid: 'firebase-uid-123',
        email: 'user@example.com',
        role: 'ADMIN',
        tenantId: 1,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.findOrCreateUserByFirebaseUid('firebase-uid-123');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { firebaseUid: 'firebase-uid-123' },
        include: {
          tenant: true,
          driver: true,
        },
      });
    });

    it('should return null if user not found and no email provided', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      const result = await service.findOrCreateUserByFirebaseUid('firebase-uid-123');

      expect(result).toBeNull();
    });
  });
});
