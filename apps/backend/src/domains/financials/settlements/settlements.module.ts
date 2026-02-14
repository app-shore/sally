import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { PayStructureService } from './services/pay-structure.service';
import { SettlementsService } from './services/settlements.service';
import { PayStructureController } from './controllers/pay-structure.controller';
import { SettlementsController } from './controllers/settlements.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PayStructureController, SettlementsController],
  providers: [PayStructureService, SettlementsService],
  exports: [PayStructureService, SettlementsService],
})
export class SettlementsModule {}
