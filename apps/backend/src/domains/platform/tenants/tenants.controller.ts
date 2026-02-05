import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { Public } from '../../../auth/decorators/public.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterTenantDto) {
    return this.tenantsService.registerTenant(dto);
  }

  @Public()
  @Get('check-subdomain/:subdomain')
  async checkSubdomain(@Param('subdomain') subdomain: string) {
    const available =
      await this.tenantsService.checkSubdomainAvailability(subdomain);
    return { available };
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  async getAllTenants(@Query('status') status?: string) {
    return this.tenantsService.getAllTenants(status);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post(':tenantId/approve')
  async approveTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.tenantsService.approveTenant(tenantId, user.email);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post(':tenantId/reject')
  async rejectTenant(
    @Param('tenantId') tenantId: string,
    @Body('reason') reason: string,
  ) {
    return this.tenantsService.rejectTenant(tenantId, reason);
  }
}
