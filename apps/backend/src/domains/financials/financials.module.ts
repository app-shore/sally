import { Module } from '@nestjs/common';
import { InvoicingModule } from './invoicing/invoicing.module';
import { PaymentsModule } from './payments/payments.module';
import { SettlementsModule } from './settlements/settlements.module';

@Module({
  imports: [InvoicingModule, PaymentsModule, SettlementsModule],
  exports: [InvoicingModule, PaymentsModule, SettlementsModule],
})
export class FinancialsModule {}
