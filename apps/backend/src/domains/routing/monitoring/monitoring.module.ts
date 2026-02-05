import { Module } from '@nestjs/common';
import { DynamicUpdateHandlerService } from './services/dynamic-update-handler.service';
import { HOSComplianceModule } from '../hos-compliance/hos-compliance.module';

/**
 * MonitoringModule handles dynamic route monitoring and updates
 */
@Module({
  imports: [HOSComplianceModule],
  providers: [DynamicUpdateHandlerService],
  exports: [DynamicUpdateHandlerService],
})
export class MonitoringModule {}
