import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { InvoicingController } from './controllers/invoicing.controller';
import { InvoicingService } from './services/invoicing.service';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [InvoicingController],
  providers: [InvoicingService],
  exports: [InvoicingService],
})
export class InvoicingModule {}
