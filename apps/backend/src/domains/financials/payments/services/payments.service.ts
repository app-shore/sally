import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordPayment(tenantId: number, invoiceId: string, data: {
    amount_cents: number;
    payment_method?: string;
    reference_number?: string;
    payment_date: string;
    notes?: string;
  }, userId?: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { invoiceId, tenantId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'VOID') throw new BadRequestException('Cannot record payment on voided invoice');
    if (invoice.status === 'PAID') throw new BadRequestException('Invoice is already fully paid');

    if (data.amount_cents > invoice.balanceCents) {
      throw new BadRequestException(`Payment amount ($${(data.amount_cents / 100).toFixed(2)}) exceeds balance ($${(invoice.balanceCents / 100).toFixed(2)})`);
    }

    const newPaidCents = invoice.paidCents + data.amount_cents;
    const newBalanceCents = invoice.totalCents - newPaidCents;
    const newStatus = newBalanceCents <= 0 ? 'PAID' : 'PARTIAL';

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          paymentId: `pay_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
          invoiceId: invoice.id,
          amountCents: data.amount_cents,
          paymentMethod: data.payment_method || null,
          referenceNumber: data.reference_number || null,
          paymentDate: new Date(data.payment_date),
          notes: data.notes || null,
          tenantId,
          createdBy: userId || null,
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paidCents: newPaidCents,
          balanceCents: newBalanceCents,
          status: newStatus,
          paidDate: newStatus === 'PAID' ? new Date() : null,
        },
      }),
    ]);

    this.logger.log(`Recorded payment of $${(data.amount_cents / 100).toFixed(2)} on invoice ${invoice.invoiceNumber}`);
    return payment;
  }
}
