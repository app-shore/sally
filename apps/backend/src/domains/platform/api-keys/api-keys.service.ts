import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { nanoid } from 'nanoid';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyDto } from './dto/api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateApiKeyDto): Promise<ApiKeyDto> {
    const prefix = 'sk_staging_';
    const randomPart = nanoid(32);
    const key = prefix + randomPart;

    const apiKey = await this.prisma.apiKey.create({
      data: {
        key,
        name: dto.name,
        userId,
        isActive: true
      }
    });

    return {
      id: apiKey.id,
      key: apiKey.key, // Only returned on creation
      name: apiKey.name,
      requestCount: apiKey.requestCount,
      lastUsedAt: apiKey.lastUsedAt,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt
    };
  }

  async findAll(userId: number): Promise<ApiKeyDto[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    return keys.map(key => ({
      id: key.id,
      // Don't return the actual key in list
      name: key.name,
      requestCount: key.requestCount,
      lastUsedAt: key.lastUsedAt,
      isActive: key.isActive,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt
    }));
  }

  async revoke(id: string, userId: number): Promise<void> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId }
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        isActive: false
      }
    });
  }

  async validateKey(key: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key },
      include: { user: true }
    });

    if (!apiKey || !apiKey.isActive || apiKey.revokedAt) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update usage stats asynchronously
    this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        requestCount: { increment: 1 }
      }
    }).catch(err => console.error('Failed to update API key usage:', err));

    return apiKey;
  }
}
