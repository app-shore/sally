import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { EmailService } from '../../common/services/email.service';

@Module({
  imports: [PrismaModule],
  providers: [NotificationService, EmailService],
  exports: [NotificationService],
})
export class NotificationModule {}
