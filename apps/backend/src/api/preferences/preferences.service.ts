import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserPreferencesDto } from './dto/user-preferences.dto';
import { UpdateDispatcherPreferencesDto } from './dto/dispatcher-preferences.dto';
import { UpdateDriverPreferencesDto } from './dto/driver-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // USER PREFERENCES
  // ============================================================================

  async getUserPreferences(userIdString: string) {
    // First, get the numeric user ID from the string userId
    const user = await this.prisma.user.findUnique({
      where: { userId: userIdString },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get or create user preferences with defaults
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });

    if (!preferences) {
      // Create with defaults
      preferences = await this.prisma.userPreferences.create({
        data: { userId: user.id },
      });
    }

    return preferences;
  }

  async updateUserPreferences(userIdString: string, dto: UpdateUserPreferencesDto) {
    // Get numeric user ID
    const user = await this.prisma.user.findUnique({
      where: { userId: userIdString },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate preferences
    this.validateUserPreferences(dto);

    // Upsert preferences
    const preferences = await this.prisma.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...dto,
      },
      update: dto,
    });

    return preferences;
  }

  // ============================================================================
  // DISPATCHER PREFERENCES
  // ============================================================================

  async getDispatcherPreferences(userIdString: string, userRole: string, tenantIdString: string) {
    // Check role
    if (userRole !== 'DISPATCHER' && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only dispatchers and admins can access route planning preferences');
    }

    // Get tenant numeric ID
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId: tenantIdString },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Get or create dispatcher preferences with defaults (one per tenant)
    let preferences = await this.prisma.dispatcherPreferences.findUnique({
      where: { tenantId: tenant.id },
    });

    if (!preferences) {
      // Create with defaults
      preferences = await this.prisma.dispatcherPreferences.create({
        data: { tenantId: tenant.id },
      });
    }

    return preferences;
  }

  async updateDispatcherPreferences(userIdString: string, userRole: string, tenantIdString: string, dto: UpdateDispatcherPreferencesDto) {
    // Check role
    if (userRole !== 'DISPATCHER' && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only dispatchers and admins can update route planning preferences');
    }

    // Get tenant numeric ID
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId: tenantIdString },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Validate preferences
    this.validateDispatcherPreferences(dto);

    // Upsert preferences (one per tenant)
    const preferences = await this.prisma.dispatcherPreferences.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        ...dto,
      },
      update: dto,
    });

    return preferences;
  }

  // ============================================================================
  // DRIVER PREFERENCES
  // ============================================================================

  async getDriverPreferences(userIdString: string, userRole: string) {
    // Check role
    if (userRole !== 'DRIVER' && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only drivers and admins can access driver preferences');
    }

    // Get numeric user ID and driver ID
    const user = await this.prisma.user.findUnique({
      where: { userId: userIdString },
      select: { id: true, driverId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get or create driver preferences with defaults
    let preferences = await this.prisma.driverPreferences.findUnique({
      where: { userId: user.id },
    });

    if (!preferences) {
      // Create with defaults
      preferences = await this.prisma.driverPreferences.create({
        data: {
          userId: user.id,
          driverId: user.driverId || null,
        },
      });
    }

    return preferences;
  }

  async updateDriverPreferences(userIdString: string, userRole: string, dto: UpdateDriverPreferencesDto) {
    // Check role
    if (userRole !== 'DRIVER' && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only drivers and admins can update driver preferences');
    }

    // Get numeric user ID and driver ID
    const user = await this.prisma.user.findUnique({
      where: { userId: userIdString },
      select: { id: true, driverId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate preferences
    this.validateDriverPreferences(dto);

    // Upsert preferences
    const preferences = await this.prisma.driverPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        driverId: user.driverId || null,
        ...dto,
      },
      update: dto,
    });

    return preferences;
  }

  // ============================================================================
  // RESET TO DEFAULTS
  // ============================================================================

  async resetToDefaults(userIdString: string, tenantIdString: string, scope: 'user' | 'dispatcher' | 'driver', userRole: string) {
    // Get numeric user ID
    const user = await this.prisma.user.findUnique({
      where: { userId: userIdString },
      select: { id: true, driverId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (scope === 'user') {
      // Delete and recreate with defaults
      await this.prisma.userPreferences.delete({ where: { userId: user.id } }).catch(() => {});
      return await this.prisma.userPreferences.create({ data: { userId: user.id } });
    }

    if (scope === 'dispatcher') {
      if (userRole !== 'DISPATCHER' && userRole !== 'ADMIN') {
        throw new ForbiddenException('Only dispatchers and admins can reset route planning preferences');
      }

      // Get tenant numeric ID
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: tenantIdString },
        select: { id: true },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      await this.prisma.dispatcherPreferences.delete({ where: { tenantId: tenant.id } }).catch(() => {});
      return await this.prisma.dispatcherPreferences.create({ data: { tenantId: tenant.id } });
    }

    if (scope === 'driver') {
      if (userRole !== 'DRIVER' && userRole !== 'ADMIN') {
        throw new ForbiddenException('Only drivers and admins can reset driver preferences');
      }
      await this.prisma.driverPreferences.delete({ where: { userId: user.id } }).catch(() => {});
      return await this.prisma.driverPreferences.create({
        data: { userId: user.id, driverId: user.driverId || null },
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
