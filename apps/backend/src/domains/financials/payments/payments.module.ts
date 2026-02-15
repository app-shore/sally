import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { PaymentsService } from './services/payments.service';

@Module({
  imports: [PrismaModule],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
