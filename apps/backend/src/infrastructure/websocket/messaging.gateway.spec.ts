import { Test, TestingModule } from '@nestjs/testing';
import { MessagingGateway } from './messaging.gateway';
import { PrismaService } from '../database/prisma.service';

describe('MessagingGateway', () => {
  let gateway: MessagingGateway;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingGateway,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    gateway = module.get<MessagingGateway>(MessagingGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
