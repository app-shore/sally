import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertService } from './services/alert.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

/**
 * AlertsModule handles alert management and notifications
 */
@Module({
  imports: [PrismaModule],
  controllers: [AlertsController],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertsModule {}
