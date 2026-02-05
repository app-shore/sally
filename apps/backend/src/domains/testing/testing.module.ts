import { Module } from '@nestjs/common';
import { ScenariosModule } from './scenarios/scenarios.module';
import { ExternalMockModule } from './external-mock/external-mock.module';
import { MockExternalModule } from './mock-external/mock-external.module';

/**
 * TestingModule aggregates all testing-related modules:
 * - Scenarios: Test scenarios and test data
 * - ExternalMock: Mock external API endpoints
 * - MockExternal: Mock TMS endpoints
 */
@Module({
  imports: [ScenariosModule, ExternalMockModule, MockExternalModule],
  exports: [ScenariosModule, ExternalMockModule, MockExternalModule],
})
export class TestingModule {}
