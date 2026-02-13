import { Controller, Post, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { BaseTenantController } from '../../../../shared/base/base-tenant.controller';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { InvoicingService } from '../services/invoicing.service';
import { PaymentsService } from '../../payments/services/payments.service';
import { CreateInvoiceDto, RecordPaymentDto, UpdateInvoiceDto } from '../dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicingController extends BaseTenantController {
  constructor(
    prisma: PrismaService,
    private readonly invoicingService: InvoicingService,
    private readonly paymentsService: PaymentsService,
  ) {
    super(prisma);
  }

  @Post('generate/:load_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Auto-generate invoice from delivered load' })
  async generateFromLoad(
    @CurrentUser() user: any,
    @Param('load_id') loadId: string,
    @Body() body: { payment_terms_days?: number; notes?: string; internal_notes?: string },
  ) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.generateFromLoad(tenantDbId, loadId, body);
  }

  @Post()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create invoice with manual line items' })
  async create(@CurrentUser() user: any, @Body() dto: CreateInvoiceDto) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.generateFromLoad(tenantDbId, dto.load_id, {
      payment_terms_days: dto.payment_terms_days,
      notes: dto.notes,
      internal_notes: dto.internal_notes,
    });
  }

  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'List invoices with filtering' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customer_id', required: false })
  @ApiQuery({ name: 'overdue_only', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('customer_id') customerId?: string,
    @Query('overdue_only') overdueOnly?: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.findAll(
      tenantDbId,
      { status, customer_id: customerId ? Number(customerId) : undefined, overdue_only: overdueOnly === 'true' },
      { limit: Number(limit), offset: Number(offset) },
    );
  }

  @Get('summary')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'AR summary with aging buckets' })
  async getSummary(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.getSummary(tenantDbId);
  }

  @Get(':invoice_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get invoice detail with line items and payments' })
  async findOne(@CurrentUser() user: any, @Param('invoice_id') invoiceId: string) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.findOne(tenantDbId, invoiceId);
  }

  @Patch(':invoice_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update draft invoice' })
  async update(@CurrentUser() user: any, @Param('invoice_id') invoiceId: string, @Body() dto: UpdateInvoiceDto) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.update(tenantDbId, invoiceId, dto);
  }

  @Post(':invoice_id/send')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Mark invoice as sent' })
  async markSent(@CurrentUser() user: any, @Param('invoice_id') invoiceId: string) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.markSent(tenantDbId, invoiceId);
  }

  @Post(':invoice_id/void')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Void an invoice' })
  async voidInvoice(@CurrentUser() user: any, @Param('invoice_id') invoiceId: string) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.invoicingService.voidInvoice(tenantDbId, invoiceId);
  }

  @Post(':invoice_id/payments')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Record payment against invoice' })
  async recordPayment(@CurrentUser() user: any, @Param('invoice_id') invoiceId: string, @Body() dto: RecordPaymentDto) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.paymentsService.recordPayment(tenantDbId, invoiceId, dto, user.userId);
  }
}
