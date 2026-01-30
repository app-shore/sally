import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UpdateUserPreferencesDto } from './dto/user-preferences.dto';
import { UpdateDispatcherPreferencesDto } from './dto/dispatcher-preferences.dto';
import { UpdateDriverPreferencesDto } from './dto/driver-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaClient) {}

  // ============================================================================
  // USER PREFERENCES
  // ============================================================================

  async getUserPreferences(userId: number) {
    // Get or create user preferences with defaults
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create with defaults
      preferences = await this.prisma.userPreferences.create({
        data: { userId },
      });
    }

    return preferences;
  }

  async updateUserPreferences(userId: number, dto: UpdateUserPreferencesDto) {
    // Validate preferences
    this.validateUserPreferences(dto);

    // Upsert preferences
    const preferences = await this.prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
      },
      update: dto,
    });

    return preferences;
  }

  // ============================================================================
  // DISPATCHER PREFERENCES
  // ============================================================================

  async getDispatcherPreferences(userId: number, userRole: string) {
    // Check role
    if (userRole !== 'DISPATCHER' && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only dispatchers and admins can access dispatcher preferences');
    }

    // Get or create dispatcher preferences with defaults
    let preferences = await this.prisma.dispatcherPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create with defaults
      preferences = await this.prisma.dispatcherPreferences.create({
        data: { userId },
      });
    }

    return preferences;
  }

  async updateDispatcherPreferences(userId: number, userRole: string, dto: UpdateDispatcherPreferencesDto) {
    // Check role
    if (userRole !== 'DISPATCHER' && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only dispatchers and admins can update dispatcher preferences');
    }

    // Validate preferences
    this.validateDispatcherPreferences(dto);

    // Upsert preferences
    const preferences = await this.prisma.dispatcherPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
      },
      update: dto,
    });

    return preferences;
  }

  // ============================================================================
  // DRIVER PREFERENCES
  // ============================================================================

  async getDriverPreferences(userId: number, userRole: string) {
    // Check role
    if (userRole !== 'DRIVER' && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only drivers and admins can access driver preferences');
    }

    // Get or create driver preferences with defaults
    let preferences = await this.prisma.driverPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Get driver ID if available
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { driverId: true },
      });

      // Create with defaults
      preferences = await this.prisma.driverPreferences.create({
        data: {
          userId,
          driverId: user?.driverId || null,
        },
      });
    }

    return preferences;
  }

  async updateDriverPreferences(userId: number, userRole: string, dto: UpdateDriverPreferencesDto) {
    // Check role
    if (userRole !== 'DRIVER' && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only drivers and admins can update driver preferences');
    }

    // Validate preferences
    this.validateDriverPreferences(dto);

    // Get driver ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { driverId: true },
    });

    // Upsert preferences
    const preferences = await this.prisma.driverPreferences.upsert({
      where: { userId },
      create: {
        userId,
        driverId: user?.driverId || null,
        ...dto,
      },
      update: dto,
    });

    return preferences;
  }

  // ============================================================================
  // RESET TO DEFAULTS
  // ============================================================================

  async resetToDefaults(userId: number, scope: 'user' | 'dispatcher' | 'driver', userRole: string) {
    if (scope === 'user') {
      // Delete and recreate with defaults
      await this.prisma.userPreferences.delete({ where: { userId } }).catch(() => {});
      return await this.prisma.userPreferences.create({ data: { userId } });
    }

    if (scope === 'dispatcher') {
      if (userRole !== 'DISPATCHER' && userRole !== 'ADMIN') {
        throw new ForbiddenException('Only dispatchers and admins can reset dispatcher preferences');
      }
      await this.prisma.dispatcherPreferences.delete({ where: { userId } }).catch(() => {});
      return await this.prisma.dispatcherPreferences.create({ data: { userId } });
    }

    if (scope === 'driver') {
      if (userRole !== 'DRIVER' && userRole !== 'ADMIN') {
        throw new ForbiddenException('Only drivers and admins can reset driver preferences');
      }
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { driverId: true },
      });
      await this.prisma.driverPreferences.delete({ where: { userId } }).catch(() => {});
      return await this.prisma.driverPreferences.create({
        data: { userId, driverId: user?.driverId || null },
      });
    }

    throw new BadRequestException('Invalid scope. Must be: user, dispatcher, or driver');
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  private validateUserPreferences(dto: UpdateUserPreferencesDto) {
    // Validate quiet hours format if provided
    if (dto.quietHoursStart && !this.isValidTimeFormat(dto.quietHoursStart)) {
      throw new BadRequestException('quietHoursStart must be in HH:MM format (24h)');
    }
    if (dto.quietHoursEnd && !this.isValidTimeFormat(dto.quietHoursEnd)) {
      throw new BadRequestException('quietHoursEnd must be in HH:MM format (24h)');
    }
  }

  private validateDispatcherPreferences(dto: UpdateDispatcherPreferencesDto) {
    // Validate warning < critical for HOS thresholds
    if (dto.driveHoursWarningPct !== undefined && dto.driveHoursCriticalPct !== undefined) {
      if (dto.driveHoursWarningPct >= dto.driveHoursCriticalPct) {
        throw new BadRequestException('driveHoursWarningPct must be less than driveHoursCriticalPct');
      }
    }
    if (dto.onDutyWarningPct !== undefined && dto.onDutyCriticalPct !== undefined) {
      if (dto.onDutyWarningPct >= dto.onDutyCriticalPct) {
        throw new BadRequestException('onDutyWarningPct must be less than onDutyCriticalPct');
      }
    }
    if (dto.sinceBreakWarningPct !== undefined && dto.sinceBreakCriticalPct !== undefined) {
      if (dto.sinceBreakWarningPct >= dto.sinceBreakCriticalPct) {
        throw new BadRequestException('sinceBreakWarningPct must be less than sinceBreakCriticalPct');
      }
    }
  }

  private validateDriverPreferences(dto: UpdateDriverPreferencesDto) {
    // Validate emergency contact format if provided
    if (dto.emergencyContact && !this.isValidPhoneNumber(dto.emergencyContact)) {
      throw new BadRequestException('emergencyContact must be a valid phone number');
    }
  }

  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}
