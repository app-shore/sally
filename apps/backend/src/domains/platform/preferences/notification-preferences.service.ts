import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: number, tenantId: number) {
    let prefs = await this.prisma.userNotificationPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.userNotificationPreferences.create({
        data: {
          userId,
          tenantId,
          alertChannels: {},
          notificationChannels: {},
          soundEnabled: { critical: true, high: true, medium: false, low: false },
        },
      });
    }

    return prefs;
  }

  async updatePreferences(userId: number, tenantId: number, dto: UpdateNotificationPreferencesDto) {
    return this.prisma.userNotificationPreferences.upsert({
      where: { userId },
      create: {
        userId,
        tenantId,
        ...dto,
      },
      update: dto,
    });
  }
}
