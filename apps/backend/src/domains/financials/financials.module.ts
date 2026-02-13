import { Module } from '@nestjs/common';
import { InvoicingModule } from './invoicing/invoicing.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [InvoicingModule, PaymentsModule],
  exports: [InvoicingModule, PaymentsModule],
})
export class FinancialsModule {}
