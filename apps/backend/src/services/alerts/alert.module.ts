import { Module } from '@nestjs/common';
import { AlertService } from './alert.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ServicesModule } from '../../common/services/services.module';

@Module({
  imports: [PrismaModule, ServicesModule],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
