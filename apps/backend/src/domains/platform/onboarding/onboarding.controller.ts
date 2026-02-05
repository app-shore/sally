import { Controller, Get, Logger, UseGuards, Inject } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../auth/guards/tenant.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { TenantDbId } from '../../../auth/decorators/tenant-db-id.decorator';
import { OnboardingStatusResponse } from './dto/onboarding-status.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(
    private readonly onboardingService: OnboardingService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get('status')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getOnboardingStatus(
    @TenantDbId() tenantDbId: number,
  ): Promise<OnboardingStatusResponse> {
    this.logger.log(`GET /onboarding/status for tenant DB ID ${tenantDbId}`);

    const cacheKey = `onboarding:status:tenant:${tenantDbId}`;

    // Check cache
    const cached =
      await this.cacheManager.get<OnboardingStatusResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    // Compute status
    const status = await this.onboardingService.getOnboardingStatus(tenantDbId);

    // Cache for 30 seconds
    await this.cacheManager.set(cacheKey, status, 30000);
    this.logger.debug(`Cached ${cacheKey} for 30 seconds`);

    return status;
  }
}
