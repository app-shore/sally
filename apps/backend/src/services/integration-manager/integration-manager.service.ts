import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { SamsaraHOSAdapter } from '../adapters/hos/samsara-hos.adapter';
import { HOSData } from '../adapters/hos/hos-adapter.interface';
import { McLeodTMSAdapter } from '../adapters/tms/mcleod-tms.adapter';
import { TruckbaseTMSAdapter } from '../adapters/tms/truckbase-tms.adapter';
import { GasBuddyFuelAdapter } from '../adapters/fuel/gasbuddy-fuel.adapter';
import { FuelFinderAdapter } from '../adapters/fuel/fuelfinder-fuel.adapter';
import { OpenWeatherAdapter } from '../adapters/weather/openweather.adapter';

/**
 * Central service for managing external system integrations
 *
 * Responsibilities:
 * - Fetch data from external systems with caching
 * - Handle manual overrides
 * - Graceful degradation when APIs are down
 * - Test connections
 * - Sync data in background
 */
@Injectable()
export class IntegrationManagerService {
  constructor(
    private prisma: PrismaService,
    private credentials: CredentialsService,
    private samsaraAdapter: SamsaraHOSAdapter,
    private mcleodAdapter: McLeodTMSAdapter,
    private truckbaseAdapter: TruckbaseTMSAdapter,
    private gasBuddyAdapter: GasBuddyFuelAdapter,
    private fuelFinderAdapter: FuelFinderAdapter,
    private openWeatherAdapter: OpenWeatherAdapter,
  ) {}

  /**
   * Fetch driver HOS (with cache fallback strategy)
   *
   * Priority:
   * 1. Manual override → return override
   * 2. Fresh cache (<5min) → return cached
   * 3. Fetch from ELD → update cache
   * 4. Stale cache (on error) → return with warning
   */
  async getDriverHOS(tenantId: number, driverId: string): Promise<HOSData> {
    const driver = await this.prisma.driver.findFirst({
      where: { driverId, tenantId },
    });

    if (!driver) {
      throw new Error(`Driver ${driverId} not found`);
    }

    // 1. Manual override takes precedence
    if (driver.hosManualOverride && driver.hosData) {
      return {
        ...(driver.hosData as any),
        data_source: 'manual_override',
        cached: true,
      };
    }

    // 2. Check cache freshness
    const cacheAge = driver.hosDataSyncedAt
      ? Date.now() - driver.hosDataSyncedAt.getTime()
      : Infinity;
    const isCacheFresh = cacheAge < 5 * 60 * 1000; // 5 minutes

    if (isCacheFresh && driver.hosData) {
      return {
        ...(driver.hosData as any),
        cached: true,
        cache_age_seconds: Math.floor(cacheAge / 1000),
      };
    }

    // 3. Fetch from ELD
    try {
      const integration = await this.prisma.integrationConfig.findFirst({
        where: {
          tenantId,
          integrationType: 'HOS_ELD',
          status: 'ACTIVE',
        },
      });

      if (!integration) {
        throw new Error('No active HOS integration configured');
      }

      const apiKey = this.getApiKeyFromCredentials(integration.credentials);

      const hosData = await this.samsaraAdapter.getDriverHOS(
        apiKey,
        driver.externalDriverId || driverId,
      );

      // Update cache
      await this.prisma.driver.update({
        where: { id: driver.id },
        data: {
          hosData: hosData as any,
          hosDataSyncedAt: new Date(),
          hosDataSource: hosData.data_source,
          lastSyncedAt: new Date(),
        },
      });

      return hosData;
    } catch (error) {
      // 4. Fall back to stale cache
      if (driver.hosData) {
        console.warn(
          `Failed to fetch HOS for ${driverId}, using stale cache: ${error.message}`,
        );
        return {
          ...(driver.hosData as any),
          cached: true,
          stale: true,
          cache_age_seconds: Math.floor(cacheAge / 1000),
          error: error.message,
        };
      }

      throw new Error(
        `No HOS data available for driver ${driverId}: ${error.message}`,
      );
    }
  }

  /**
   * Test connection to external system
   */
  async testConnection(integrationId: string): Promise<boolean> {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { integrationId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    try {
      const apiKey = this.getApiKeyFromCredentials(integration.credentials);

      let success = false;

      // Test connection based on vendor
      if (integration.vendor === 'SAMSARA_ELD' || integration.vendor === 'KEEPTRUCKIN_ELD' || integration.vendor === 'MOTIVE_ELD') {
        success = await this.samsaraAdapter.testConnection(apiKey);
      } else if (integration.vendor === 'MCLEOD_TMS' || integration.vendor === 'TMW_TMS') {
        success = await this.mcleodAdapter.testConnection(apiKey);
      } else if (integration.vendor === 'TRUCKBASE_TMS') {
        success = await this.truckbaseAdapter.testConnection(apiKey);
      } else if (integration.vendor === 'GASBUDDY_FUEL') {
        success = await this.gasBuddyAdapter.testConnection(apiKey);
      } else if (integration.vendor === 'FUELFINDER_FUEL') {
        success = await this.fuelFinderAdapter.testConnection(apiKey);
      } else if (integration.vendor === 'OPENWEATHER') {
        success = await this.openWeatherAdapter.testConnection(apiKey);
      } else {
        throw new Error(`Unsupported vendor: ${integration.vendor}`);
      }

      // Update integration status
      await this.prisma.integrationConfig.update({
        where: { id: integration.id },
        data: {
          status: success ? 'ACTIVE' : 'ERROR',
          lastSuccessAt: success ? new Date() : integration.lastSuccessAt,
          lastErrorAt: success ? integration.lastErrorAt : new Date(),
          lastErrorMessage: success
            ? null
            : 'Connection test failed - check credentials',
        },
      });

      return success;
    } catch (error) {
      await this.prisma.integrationConfig.update({
        where: { id: integration.id },
        data: {
          status: 'ERROR',
          lastErrorAt: new Date(),
          lastErrorMessage: error.message,
        },
      });

      return false;
    }
  }

  /**
   * Sync driver HOS data (called by scheduler)
   */
  async syncDriverHOS(tenantId: number, driverId: string): Promise<void> {
    try {
      await this.getDriverHOS(tenantId, driverId);
    } catch (error) {
      console.error(`Failed to sync HOS for driver ${driverId}:`, error);
      throw error;
    }
  }

  /**
   * Sync all drivers for a tenant
   */
  async syncAllDriversForTenant(tenantId: number): Promise<void> {
    const drivers = await this.prisma.driver.findMany({
      where: {
        tenantId,
        isActive: true,
        hosManualOverride: false, // Skip manually overridden drivers
      },
    });

    console.log(`Syncing HOS for ${drivers.length} drivers (tenant ${tenantId})`);

    const results = await Promise.allSettled(
      drivers.map((driver) => this.syncDriverHOS(tenantId, driver.driverId)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(
      `HOS sync complete for tenant ${tenantId}: ${succeeded} succeeded, ${failed} failed`,
    );
  }

  /**
   * Extract API key from encrypted credentials JSON
   */
  private getApiKeyFromCredentials(credentials: any): string {
    if (!credentials || !credentials.apiKey) {
      throw new Error('Invalid credentials - apiKey missing');
    }

    try {
      return this.credentials.decrypt(credentials.apiKey);
    } catch {
      // If not encrypted, return as-is (for development)
      return credentials.apiKey;
    }
  }
}
