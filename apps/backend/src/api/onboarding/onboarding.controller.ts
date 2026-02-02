import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { OnboardingStatusResponse } from './dto/onboarding-status.dto';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(
    private readonly onboardingService: OnboardingService,
  ) {}

  @Get('status')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getOnboardingStatus(
    @TenantId() tenantId: number,
  ): Promise<OnboardingStatusResponse> {
    this.logger.log(`GET /onboarding/status for tenant ${tenantId}`);

    // Compute status (TODO: Re-enable caching when CacheModule is configured)
    const status = await this.onboardingService.getOnboardingStatus(tenantId);

    return status;
  }
}
