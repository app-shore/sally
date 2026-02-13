import { Controller, Get, Post, Query, Param, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { BaseTenantController } from '../../../../shared/base/base-tenant.controller';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { QuickBooksService } from '../services/quickbooks.service';
import { Public } from '../../../../auth/decorators/public.decorator';
import { Response } from 'express';

@ApiTags('QuickBooks')
@ApiBearerAuth()
@Controller('quickbooks')
export class QuickBooksController extends BaseTenantController {
  constructor(
    prisma: PrismaService,
    private readonly qbService: QuickBooksService,
  ) {
    super(prisma);
  }

  @Get('connect')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get QuickBooks OAuth authorization URL' })
  async connect(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    const url = this.qbService.getAuthUrl(tenantDbId);
    return { auth_url: url };
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'QuickBooks OAuth callback' })
  async callback(
    @Query('code') code: string,
    @Query('realmId') realmId: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { tenantId } = JSON.parse(Buffer.from(state, 'base64').toString());
    await this.qbService.handleCallback(code, realmId, tenantId);
    // Redirect back to settings page
    res.redirect('/settings/integrations?qb=connected');
  }

  @Post('disconnect')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Disconnect QuickBooks' })
  async disconnect(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.qbService.disconnect(tenantDbId);
  }

  @Get('status')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get QuickBooks connection status' })
  async status(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.qbService.getStatus(tenantDbId);
  }

  @Post('sync/invoice/:invoice_id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Sync invoice to QuickBooks' })
  async syncInvoice(@CurrentUser() user: any, @Param('invoice_id') invoiceId: string) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.qbService.syncInvoice(tenantDbId, invoiceId);
  }

  @Post('sync/settlement/:settlement_id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Sync settlement to QuickBooks' })
  async syncSettlement(@CurrentUser() user: any, @Param('settlement_id') settlementId: string) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.qbService.syncSettlement(tenantDbId, settlementId);
  }
}
