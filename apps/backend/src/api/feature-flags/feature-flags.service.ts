import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { FeatureFlagDto } from './dto/feature-flag.dto';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlagDto[]> {
    const flags = await this.prisma.featureFlag.findMany({
      orderBy: { category: 'asc' },
    });

    return flags.map((flag) => ({
      key: flag.key,
      name: flag.name,
      description: flag.description || undefined,
      enabled: flag.enabled,
      category: flag.category,
    }));
  }

  /**
   * Get specific flag by key
   */
  async getFlagByKey(key: string): Promise<FeatureFlagDto | null> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
    });

    if (!flag) return null;

    return {
      key: flag.key,
      name: flag.name,
      description: flag.description || undefined,
      enabled: flag.enabled,
      category: flag.category,
    };
  }

  /**
   * Check if a feature is enabled
   */
  async isEnabled(key: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
      select: { enabled: true },
    });

    return flag?.enabled ?? false;
  }

  /**
   * Toggle feature flag (for admin use)
   */
  async toggleFlag(key: string, enabled: boolean): Promise<FeatureFlagDto> {
    const flag = await this.prisma.featureFlag.update({
      where: { key },
      data: { enabled },
    });

    this.logger.log(
      `Feature flag '${key}' ${enabled ? 'enabled' : 'disabled'}`,
    );

    return {
      key: flag.key,
      name: flag.name,
      description: flag.description || undefined,
      enabled: flag.enabled,
      category: flag.category,
    };
  }
}
