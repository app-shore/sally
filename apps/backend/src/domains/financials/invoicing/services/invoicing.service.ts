import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate an invoice from a delivered load.
   * Auto-creates line items from load rate and stop data.
   */
  async generateFromLoad(tenantId: number, loadId: string, options?: { payment_terms_days?: number; notes?: string; internal_notes?: string }) {
    const load = await this.prisma.load.findFirst({
      where: { loadId: loadId, tenantId },
      include: { stops: { include: { stop: true } }, customer: true },
    });

    if (!load) throw new NotFoundException('Load not found');
    if (load.status !== 'delivered') throw new BadRequestException('Can only generate invoices for delivered loads');
    if (!load.customerId) throw new BadRequestException('Load must have a customer assigned');
    if (!load.rateCents) throw new BadRequestException('Load must have a rate set');

    // Check for existing invoice
    const existing = await this.prisma.invoice.findFirst({
      where: { loadId: load.id, tenantId, status: { not: 'VOID' } },
    });
    if (existing) throw new BadRequestException(`Invoice ${existing.invoiceNumber} already exists for this load`);

    // Generate invoice number: INV-YYYY-SEQ
    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    // Build line items
    const lineItems: Array<{ type: 'LINEHAUL' | 'FUEL_SURCHARGE' | 'DETENTION_PICKUP' | 'DETENTION_DELIVERY' | 'LAYOVER' | 'LUMPER' | 'TONU' | 'ACCESSORIAL' | 'ADJUSTMENT'; description: string; quantity: number; unitPriceCents: number; totalCents: number; sequenceOrder: number }> = [];

    // Linehaul
    lineItems.push({
      type: 'LINEHAUL',
      description: `Line haul - Load #${load.loadNumber}`,
      quantity: 1,
      unitPriceCents: load.rateCents,
      totalCents: load.rateCents,
      sequenceOrder: 0,
    });

    // Detention at stops (if actual > estimated by > 2 hours)
    let seq = 1;
    for (const ls of load.stops) {
      if (ls.actualDockHours && ls.estimatedDockHours) {
        const overageHours = ls.actualDockHours - ls.estimatedDockHours;
        const freeHours = 2; // industry standard
        if (overageHours > freeHours) {
          const billableHours = overageHours - freeHours;
          const detentionRateCents = 7500; // $75/hr default
          const detentionType = ls.actionType === 'pickup' ? 'DETENTION_PICKUP' : 'DETENTION_DELIVERY';
          lineItems.push({
            type: detentionType,
            description: `Detention at ${ls.actionType} (${billableHours.toFixed(1)} hrs @ $75/hr)`,
            quantity: billableHours,
            unitPriceCents: detentionRateCents,
            totalCents: Math.round(billableHours * detentionRateCents),
            sequenceOrder: seq++,
          });
        }
      }
    }

    const subtotalCents = lineItems.reduce((sum, li) => sum + li.totalCents, 0);
    const paymentTermsDays = options?.payment_terms_days ?? 30;
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + paymentTermsDays);

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceId: `inv_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        invoiceNumber,
        status: 'DRAFT',
        customerId: load.customerId,
        loadId: load.id,
        subtotalCents,
        adjustmentCents: 0,
        totalCents: subtotalCents,
        paidCents: 0,
        balanceCents: subtotalCents,
        issueDate,
        dueDate,
        paymentTermsDays,
        notes: options?.notes || null,
        internalNotes: options?.internal_notes || null,
        tenantId,
        lineItems: {
          create: lineItems,
        },
      },
      include: { lineItems: true, customer: true, load: true },
    });

    this.logger.log(`Generated invoice ${invoiceNumber} for load ${load.loadNumber} (tenant ${tenantId})`);
    return invoice;
  }

  /** List invoices with filtering */
  async findAll(tenantId: number, filters?: { status?: string; customer_id?: number; overdue_only?: boolean }, pagination?: { limit?: number; offset?: number }) {
    const where: any = { tenantId };

    if (filters?.status) where.status = filters.status;
    if (filters?.customer_id) where.customerId = filters.customer_id;
    if (filters?.overdue_only) {
      where.status = { in: ['SENT', 'PARTIAL'] };
      where.dueDate = { lt: new Date() };
    }

    return this.prisma.invoice.findMany({
      where,
      include: { customer: true, load: { select: { loadNumber: true, loadId: true } }, lineItems: true },
      orderBy: { createdAt: 'desc' },
      take: pagination?.limit ?? 50,
      skip: pagination?.offset ?? 0,
    });
  }

  /** Get single invoice with all relations */
  async findOne(tenantId: number, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { invoiceId, tenantId },
      include: {
        customer: true,
        load: { include: { stops: { include: { stop: true } } } },
        lineItems: { orderBy: { sequenceOrder: 'asc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  /** Update a draft invoice */
  async update(tenantId: number, invoiceId: string, data: { payment_terms_days?: number; notes?: string; internal_notes?: string; adjustment_cents?: number; line_items?: any[] }) {
    const invoice = await this.findOne(tenantId, invoiceId);
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Can only edit draft invoices');

    const updateData: any = {};
    if (data.payment_terms_days !== undefined) {
      updateData.paymentTermsDays = data.payment_terms_days;
      const newDue = new Date(invoice.issueDate);
      newDue.setDate(newDue.getDate() + data.payment_terms_days);
      updateData.dueDate = newDue;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.internal_notes !== undefined) updateData.internalNotes = data.internal_notes;

    // Replace line items if provided
    if (data.line_items) {
      await this.prisma.invoiceLineItem.deleteMany({ where: { invoiceId: invoice.id } });
      const lineItems = data.line_items.map((li, idx) => ({
        invoiceId: invoice.id,
        type: li.type,
        description: li.description,
        quantity: li.quantity,
        unitPriceCents: li.unit_price_cents,
        totalCents: Math.round(li.quantity * li.unit_price_cents),
        sequenceOrder: idx,
      }));
      await this.prisma.invoiceLineItem.createMany({ data: lineItems });

      const subtotalCents = lineItems.reduce((sum, li) => sum + li.totalCents, 0);
      const adjustmentCents = data.adjustment_cents ?? invoice.adjustmentCents;
      updateData.subtotalCents = subtotalCents;
      updateData.adjustmentCents = adjustmentCents;
      updateData.totalCents = subtotalCents + adjustmentCents;
      updateData.balanceCents = subtotalCents + adjustmentCents - invoice.paidCents;
    } else if (data.adjustment_cents !== undefined) {
      updateData.adjustmentCents = data.adjustment_cents;
      updateData.totalCents = invoice.subtotalCents + data.adjustment_cents;
      updateData.balanceCents = invoice.subtotalCents + data.adjustment_cents - invoice.paidCents;
    }

    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: updateData,
      include: { lineItems: { orderBy: { sequenceOrder: 'asc' } }, customer: true, load: true },
    });
  }

  /** Mark invoice as sent */
  async markSent(tenantId: number, invoiceId: string) {
    const invoice = await this.findOne(tenantId, invoiceId);
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Can only send draft invoices');

    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'SENT' },
      include: { lineItems: true, customer: true, load: true },
    });
  }

  /** Void an invoice */
  async voidInvoice(tenantId: number, invoiceId: string) {
    const invoice = await this.findOne(tenantId, invoiceId);
    if (invoice.status === 'VOID') throw new BadRequestException('Invoice is already voided');
    if (invoice.status === 'PAID') throw new BadRequestException('Cannot void a fully paid invoice');

    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'VOID' },
      include: { lineItems: true, customer: true, load: true },
    });
  }

  /** AR summary: outstanding, overdue, aging buckets */
  async getSummary(tenantId: number) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } },
      select: { balanceCents: true, dueDate: true, status: true },
    });

    const now = new Date();
    let outstanding = 0;
    let overdue = 0;
    const aging = { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0 };

    for (const inv of invoices) {
      outstanding += inv.balanceCents;
      const daysPast = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));

      if (daysPast > 0) {
        overdue += inv.balanceCents;
        if (daysPast <= 30) aging.days_1_30 += inv.balanceCents;
        else if (daysPast <= 60) aging.days_31_60 += inv.balanceCents;
        else if (daysPast <= 90) aging.days_61_90 += inv.balanceCents;
        else aging.days_over_90 += inv.balanceCents;
      } else {
        aging.current += inv.balanceCents;
      }
    }

    // Paid this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidThisMonth = await this.prisma.payment.aggregate({
      where: { tenantId, paymentDate: { gte: startOfMonth } },
      _sum: { amountCents: true },
    });

    // Draft count
    const draftCount = await this.prisma.invoice.count({
      where: { tenantId, status: 'DRAFT' },
    });

    return {
      outstanding_cents: outstanding,
      overdue_cents: overdue,
      paid_this_month_cents: paidThisMonth._sum.amountCents ?? 0,
      draft_count: draftCount,
      aging,
    };
  }

  /** Generate sequential invoice number */
  private async generateInvoiceNumber(tenantId: number): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: {
        tenantId,
        invoiceNumber: { startsWith: `INV-${year}` },
      },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `INV-${year}-${seq}`;
  }
}
