import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
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

  @Post()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a customer' })
  async create(@CurrentUser() user: any, @Body() body: any) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.customersService.create({ ...body, tenant_id: tenantDbId });
  }

  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'List all customers' })
  async list(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.customersService.findAll(tenantDbId);
  }

  @Get(':customer_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get customer details' })
  async get(@Param('customer_id') customerId: string) {
    return this.customersService.findOne(customerId);
  }

  @Put(':customer_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update customer' })
  async update(@Param('customer_id') customerId: string, @Body() body: any) {
    return this.customersService.update(customerId, body);
  }
}
