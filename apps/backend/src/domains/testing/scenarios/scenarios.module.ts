import { Module } from '@nestjs/common';
import { ScenariosController } from './scenarios.controller';

/**
 * ScenariosModule handles test scenarios and test data
 */
@Module({
  imports: [],
  controllers: [ScenariosController],
  providers: [],
  exports: [],
})
export class ScenariosModule {}
