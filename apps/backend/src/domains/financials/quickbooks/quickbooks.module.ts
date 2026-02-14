import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { QuickBooksService } from './services/quickbooks.service';
import { QuickBooksController } from './controllers/quickbooks.controller';

@Module({
  imports: [PrismaModule],
  controllers: [QuickBooksController],
  providers: [QuickBooksService],
  exports: [QuickBooksService],
})
export class QuickBooksModule {}
