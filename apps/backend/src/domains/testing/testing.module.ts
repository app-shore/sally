import { Module } from '@nestjs/common';
import { ScenariosModule } from './scenarios/scenarios.module';
import { ExternalApisModule } from './external-apis/external-apis.module';
import { MockTmsModule } from './mock-tms/mock-tms.module';

/**
 * TestingModule aggregates all testing-related modules:
 * - Scenarios: Test scenarios and test data
 * - ExternalApis: Mock external API endpoints (Samsara HOS, GasBuddy, Weather, TMS)
 * - MockTms: Mock Project44 TMS-specific endpoints
 */
@Module({
  imports: [ScenariosModule, ExternalApisModule, MockTmsModule],
  exports: [ScenariosModule, ExternalApisModule, MockTmsModule],
})
export class TestingModule {}
