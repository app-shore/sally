import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UpdateOperationsSettingsDto } from './dto/operations-settings.dto';

@Injectable()
export class OperationsSettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get operations settings for a tenant (creates defaults if not exist)
   */
  async getSettings(tenantDbId: number) {
    let settings = await this.prisma.fleetOperationsSettings.findUnique({
      where: { tenantId: tenantDbId },
    });

    if (!settings) {
      settings = await this.prisma.fleetOperationsSettings.create({
        data: { tenantId: tenantDbId },
      });
    }

    return settings;
  }

  /**
   * Update operations settings for a tenant
   */
  async updateSettings(tenantDbId: number, updates: UpdateOperationsSettingsDto) {
    const settings = await this.prisma.fleetOperationsSettings.upsert({
      where: { tenantId: tenantDbId },
      create: { tenantId: tenantDbId, ...updates },
      update: updates,
    });

    return settings;
  }

  /**
   * Reset operations settings to defaults
   */
  async resetToDefaults(tenantDbId: number) {
    await this.prisma.fleetOperationsSettings
      .delete({ where: { tenantId: tenantDbId } })
      .catch(() => {});
    return this.prisma.fleetOperationsSettings.create({
      data: { tenantId: tenantDbId },
    });
  }

  /**
   * Get default values for operations settings
   */
  getDefaults() {
    return {
      defaultDriveHours: 0.0,
      defaultOnDutyHours: 0.0,
      defaultSinceBreakHours: 0.0,
      driveHoursWarningPct: 75,
      driveHoursCriticalPct: 90,
      onDutyWarningPct: 75,
      onDutyCriticalPct: 90,
      sinceBreakWarningPct: 75,
      sinceBreakCriticalPct: 90,
      defaultOptimizationMode: 'BALANCE',
      costPerMile: 1.85,
      laborCostPerHour: 25.0,
      preferFullRest: true,
      restStopBuffer: 30,
      allowDockRest: true,
      minRestDuration: 7,
      fuelPriceThreshold: 0.15,
      maxFuelDetour: 10,
      minFuelSavings: 10.0,
      defaultLoadAssignment: 'MANUAL',
      defaultDriverSelection: 'AUTO_SUGGEST',
      defaultVehicleSelection: 'AUTO_ASSIGN',
      delayThresholdMinutes: 30,
      hosApproachingPct: 85,
      costOverrunPct: 10,
      reportTimezone: 'America/New_York',
      includeMapInReports: true,
    };
  }
}
