import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HOSRulesController } from './controllers/hos-rules.controller';
import { HOSRuleEngineService } from './services/hos-rule-engine.service';

@Module({
  imports: [ConfigModule],
  controllers: [HOSRulesController],
  providers: [HOSRuleEngineService],
  exports: [HOSRuleEngineService],
})
export class HOSComplianceModule {}
