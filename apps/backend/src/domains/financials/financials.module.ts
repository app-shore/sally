import { Module } from '@nestjs/common';
import { InvoicingModule } from './invoicing/invoicing.module';
import { PaymentsModule } from './payments/payments.module';
import { SettlementsModule } from './settlements/settlements.module';
import { QuickBooksModule } from './quickbooks/quickbooks.module';

@Module({
  imports: [InvoicingModule, PaymentsModule, SettlementsModule, QuickBooksModule],
  exports: [InvoicingModule, PaymentsModule, SettlementsModule, QuickBooksModule],
})
export class FinancialsModule {}
