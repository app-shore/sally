import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UpdateUserPreferencesDto } from './dto/user-preferences.dto';
import { UpdateDriverPreferencesDto } from './dto/driver-preferences.dto';

@Injectable()
export class UserPreferencesService {
  constructor(private prisma: PrismaService) {}

  private async getUserDbId(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.id;
  }

  /**
   * Get user preferences (creates defaults if not exist)
   */
  async getUserPreferences(userId: string) {
    const dbId = await this.getUserDbId(userId);

    let prefs = await this.prisma.userPreferences.findUnique({
      where: { userId: dbId },
    });

    if (!prefs) {
      prefs = await this.prisma.userPreferences.create({
        data: { userId: dbId },
      });
    }

    return prefs;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, updates: UpdateUserPreferencesDto) {
    const dbId = await this.getUserDbId(userId);

    const prefs = await this.prisma.userPreferences.upsert({
      where: { userId: dbId },
      create: { userId: dbId, ...updates },
      update: updates,
    });

    return prefs;
  }

  /**
   * Get driver preferences (creates defaults if not exist)
   */
  async getDriverPreferences(userId: string) {
    const dbId = await this.getUserDbId(userId);

    let prefs = await this.prisma.driverPreferences.findUnique({
      where: { userId: dbId },
    });

    if (!prefs) {
      prefs = await this.prisma.driverPreferences.create({
        data: { userId: dbId },
      });
    }

    return prefs;
  }

  /**
   * Update driver preferences
   */
  async updateDriverPreferences(
    userId: string,
    updates: UpdateDriverPreferencesDto,
  ) {
    const dbId = await this.getUserDbId(userId);

    const prefs = await this.prisma.driverPreferences.upsert({
      where: { userId: dbId },
      create: { userId: dbId, ...updates },
      update: updates,
    });

    return prefs;
  }

  /**
   * Reset user or driver preferences to defaults
   */
  async resetToDefaults(userId: string, scope: 'user' | 'driver') {
    const dbId = await this.getUserDbId(userId);

    if (scope === 'user') {
      await this.prisma.userPreferences.delete({
        where: { userId: dbId },
      }).catch(() => {});
      return this.prisma.userPreferences.create({
        data: { userId: dbId },
      });
    }

    if (scope === 'driver') {
      await this.prisma.driverPreferences.delete({
        where: { userId: dbId },
      }).catch(() => {});
      return this.prisma.driverPreferences.create({
        data: { userId: dbId },
      });
    }

    throw new BadRequestException('Invalid scope');
  }
}
