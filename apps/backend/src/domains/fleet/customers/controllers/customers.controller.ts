import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseTenantController } from '../../../../shared/base/base-tenant.controller';
import { CurrentUser } from '../../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CustomersService } from '../services/customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController extends BaseTenantController {
  constructor(
    prisma: PrismaService,
    private readonly customersService: CustomersService,
  ) {
    super(prisma);
  }

  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'List all customers for the tenant' })
  async listCustomers(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.customersService.findAll(tenantDbId);
  }

  @Post()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new customer' })
  async createCustomer(
    @CurrentUser() user: any,
    @Body() body: { company_name: string; contact_email?: string; contact_phone?: string },
  ) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.customersService.create({ ...body, tenant_id: tenantDbId });
  }

  @Post(':customer_id/invite')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Invite a customer contact to the portal' })
  async inviteCustomer(
    @CurrentUser() user: any,
    @Param('customer_id') customerId: string,
    @Body() body: { email: string; first_name: string; last_name: string },
  ) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.customersService.inviteContact(customerId, {
      ...body,
      tenant_id: tenantDbId,
      invited_by: user.userId,
    });
  }
}
