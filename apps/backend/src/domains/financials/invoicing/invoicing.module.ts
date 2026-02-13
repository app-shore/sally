import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { InvoicingController } from './controllers/invoicing.controller';
import { ProfitabilityController } from './controllers/profitability.controller';
import { InvoicingService } from './services/invoicing.service';
import { ProfitabilityService } from './services/profitability.service';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [InvoicingController, ProfitabilityController],
  providers: [InvoicingService, ProfitabilityService],
  exports: [InvoicingService, ProfitabilityService],
})
export class InvoicingModule {}
