import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  OnboardingStatusResponse,
  OnboardingItem,
} from './dto/onboarding-status.dto';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private prisma: PrismaService) {}

  async getOnboardingStatus(
    tenantId: number,
  ): Promise<OnboardingStatusResponse> {
    this.logger.log(`Fetching onboarding status for tenant ${tenantId}`);

    const [
      tmsIntegration,
      activeDriverCount,
      vehicleCount,
      userCount,
      activeLoadCount,
      eldIntegration,
      fuelIntegration,
      preferencesModified,
    ] = await Promise.all([
      this.checkTmsIntegration(tenantId),
      this.checkActiveDrivers(tenantId),
      this.checkVehicles(tenantId),
      this.checkUsers(tenantId),
      this.checkActiveLoads(tenantId),
      this.checkEldIntegration(tenantId),
      this.checkFuelIntegration(tenantId),
      this.checkPreferences(tenantId),
    ]);

    // Build response with all items
    const critical: OnboardingItem[] = [
      {
        id: 'tms_integration',
        title: 'Connect TMS Integration',
        complete: tmsIntegration.connected,
        metadata: tmsIntegration,
      },
      {
        id: 'min_drivers',
        title: 'Activate at least 1 driver',
        complete: activeDriverCount.activeCount >= 1,
        metadata: activeDriverCount,
      },
      {
        id: 'min_vehicles',
        title: 'Add at least 1 vehicle',
        complete: vehicleCount.count >= 1,
        metadata: vehicleCount,
      },
    ];

    const recommended: OnboardingItem[] = [
      {
        id: 'team_invites',
        title: 'Invite team members',
        complete: userCount.count > 1,
        metadata: userCount,
      },
      {
        id: 'eld_integration',
        title: 'Connect ELD integration',
        complete: eldIntegration.connected,
        metadata: eldIntegration,
      },
      {
        id: 'min_loads',
        title: 'Minimum 3 active loads',
        complete: activeLoadCount.count >= 3,
        metadata: activeLoadCount,
      },
    ];

    const optional: OnboardingItem[] = [
      {
        id: 'fuel_integration',
        title: 'Connect fuel integration',
        complete: fuelIntegration.connected,
        metadata: fuelIntegration,
      },
      {
        id: 'preferences_configured',
        title: 'Configure operations settings',
        complete: preferencesModified.modified,
        metadata: preferencesModified,
      },
    ];

    const criticalComplete = critical.every((item) => item.complete);
    const recommendedComplete = recommended.every((item) => item.complete);
    const optionalComplete = optional.every((item) => item.complete);

    const totalItems = critical.length + recommended.length + optional.length;
    const completedItems =
      critical.filter((i) => i.complete).length +
      recommended.filter((i) => i.complete).length +
      optional.filter((i) => i.complete).length;
    const overallProgress = Math.round((completedItems / totalItems) * 100);

    return {
      overallProgress,
      criticalComplete,
      recommendedComplete,
      optionalComplete,
      items: {
        critical,
        recommended,
        optional,
      },
    };
  }

  private async checkTmsIntegration(tenantId: number) {
    const integration = await this.prisma.integrationConfig.findFirst({
      where: {
        tenantId,
        integrationType: 'TMS',
        status: 'ACTIVE',
      },
    });

    return {
      connected: !!integration,
      connectedSystem: integration?.vendor || null,
      connectedAt: integration?.lastSyncAt?.toISOString() || null,
    };
  }

  private async checkActiveDrivers(tenantId: number) {
    const count = await this.prisma.driver.count({
      where: {
        tenantId,
        isActive: true,
        status: 'ACTIVE',
      },
    });

    const pendingCount = await this.prisma.driver.count({
      where: {
        tenantId,
        status: 'PENDING_ACTIVATION',
      },
    });

    return {
      activeCount: count,
      pendingCount,
      target: 1,
    };
  }

  private async checkVehicles(tenantId: number) {
    const count = await this.prisma.vehicle.count({
      where: { tenantId },
    });

    return {
      count,
      target: 1,
    };
  }

  private async checkUsers(tenantId: number) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: { role: true },
    });

    const roleCounts = users.reduce(
      (acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      count: users.length,
      roles: roleCounts,
    };
  }

  private async checkActiveLoads(tenantId: number) {
    // TODO: Fix Load model schema to include tenantId
    const statuses = ['draft', 'pending', 'assigned', 'in_transit'];
    const count = await this.prisma.load.count({
      where: {
        status: { in: statuses },
      },
    });

    return {
      count,
      target: 3,
      statuses: {} as Record<string, number>,
    };
  }

  private async checkEldIntegration(tenantId: number) {
    const integration = await this.prisma.integrationConfig.findFirst({
      where: {
        tenantId,
        integrationType: 'HOS_ELD',
        status: 'ACTIVE',
      },
    });

    return {
      connected: !!integration,
      connectedSystem: integration?.vendor || null,
      availableProviders: ['SAMSARA_ELD', 'KEEPTRUCKIN_ELD', 'MOTIVE_ELD'],
    };
  }

  private async checkFuelIntegration(tenantId: number) {
    const integration = await this.prisma.integrationConfig.findFirst({
      where: {
        tenantId,
        integrationType: 'FUEL_PRICE',
        status: 'ACTIVE',
      },
    });

    return {
      connected: !!integration,
      connectedSystem: integration?.vendor || null,
      availableProviders: ['WEX_FUEL', 'COMDATA_FUEL'],
    };
  }

  private async checkPreferences(tenantId: number) {
    const prefs = await this.prisma.fleetOperationsSettings.findUnique({
      where: { tenantId },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      modified: prefs
        ? prefs.updatedAt.getTime() !== prefs.createdAt.getTime()
        : false,
      usingDefaults:
        !prefs || prefs.updatedAt.getTime() === prefs.createdAt.getTime(),
    };
  }
}
