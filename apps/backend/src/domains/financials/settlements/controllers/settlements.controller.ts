import { Controller, Post, Get, Param, Body, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { BaseTenantController } from '../../../../shared/base/base-tenant.controller';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { SettlementsService } from '../services/settlements.service';
import { CalculateSettlementDto, AddDeductionDto } from '../dto';

@ApiTags('Settlements')
@ApiBearerAuth()
@Controller('settlements')
export class SettlementsController extends BaseTenantController {
  constructor(
    prisma: PrismaService,
    private readonly settlementsService: SettlementsService,
  ) {
    super(prisma);
  }

  @Post('calculate')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Calculate settlement for driver in period' })
  async calculate(@CurrentUser() user: any, @Body() dto: CalculateSettlementDto) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.settlementsService.calculate(tenantDbId, dto);
  }

  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'List settlements with filtering' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'driver_id', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('driver_id') driverId?: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.settlementsService.findAll(
      tenantDbId,
      { status, driver_id: driverId },
      { limit: Number(limit), offset: Number(offset) },
    );
  }

  @Get('summary')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Settlement summary stats' })
  async getSummary(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.settlementsService.getSummary(tenantDbId);
  }

  @Get(':settlement_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get settlement detail' })
  async findOne(@CurrentUser() user: any, @Param('settlement_id') settlementId: string) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.settlementsService.findOne(tenantDbId, settlementId);
  }

  @Post(':settlement_id/deductions')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Add deduction to settlement' })
  async addDeduction(
    @CurrentUser() user: any,
    @Param('settlement_id') settlementId: string,
    @Body() dto: AddDeductionDto,
  ) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.settlementsService.addDeduction(tenantDbId, settlementId, dto);
  }

  @Delete(':settlement_id/deductions/:deduction_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Remove deduction from settlement' })
  async removeDeduction(
    @CurrentUser() user: any,
    @Param('settlement_id') settlementId: string,
    @Param('deduction_id') deductionId: string,
  ) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.settlementsService.removeDeduction(tenantDbId, settlementId, Number(deductionId));
  }

  @Post(':settlement_id/approve')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Approve settlement' })
  async approve(@CurrentUser() user: any, @Param('settlement_id') settlementId: string) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.settlementsService.approve(tenantDbId, settlementId, user.userId);
  }

  @Post(':settlement_id/pay')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Mark settlement as paid' })
  async markPaid(@CurrentUser() user: any, @Param('settlement_id') settlementId: string) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.settlementsService.markPaid(tenantDbId, settlementId);
  }

  @Post(':settlement_id/void')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Void settlement' })
  async voidSettlement(@CurrentUser() user: any, @Param('settlement_id') settlementId: string) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.settlementsService.voidSettlement(tenantDbId, settlementId);
  }
}
