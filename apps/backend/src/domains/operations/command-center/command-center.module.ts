import { Module } from '@nestjs/common';
import { CacheModule } from '../../../infrastructure/cache/cache.module';
import { CommandCenterController } from './command-center.controller';
import { CommandCenterService } from './command-center.service';

@Module({
  imports: [CacheModule],
  controllers: [CommandCenterController],
  providers: [CommandCenterService],
  exports: [CommandCenterService],
})
export class CommandCenterModule {}
