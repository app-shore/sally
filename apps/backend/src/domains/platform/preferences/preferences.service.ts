import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get super admin preferences
   * Creates default preferences if they don't exist
   */
  async getPreferences(userId: number) {
    let preferences = await this.prisma.superAdminPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.prisma.superAdminPreferences.create({
        data: {
          userId,
          notifyNewTenants: true,
          notifyStatusChanges: true,
          notificationFrequency: 'immediate',
        },
      });
    }

    return {
      notifyNewTenants: preferences.notifyNewTenants,
      notifyStatusChanges: preferences.notifyStatusChanges,
      notificationFrequency: preferences.notificationFrequency,
    };
  }

  /**
   * Update super admin preferences
   */
  async updatePreferences(userId: number, dto: UpdatePreferencesDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Upsert preferences
    const preferences = await this.prisma.superAdminPreferences.upsert({
      where: { userId },
      create: {
        userId,
        notifyNewTenants: dto.notifyNewTenants ?? true,
        notifyStatusChanges: dto.notifyStatusChanges ?? true,
        notificationFrequency: dto.notificationFrequency ?? 'immediate',
      },
      update: {
        ...(dto.notifyNewTenants !== undefined && {
          notifyNewTenants: dto.notifyNewTenants,
        }),
        ...(dto.notifyStatusChanges !== undefined && {
          notifyStatusChanges: dto.notifyStatusChanges,
        }),
        ...(dto.notificationFrequency !== undefined && {
          notificationFrequency: dto.notificationFrequency,
        }),
      },
    });

    return {
      notifyNewTenants: preferences.notifyNewTenants,
      notifyStatusChanges: preferences.notifyStatusChanges,
      notificationFrequency: preferences.notificationFrequency,
    };
  }
}
