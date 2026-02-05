import { Module } from '@nestjs/common';
import { MockTmsController } from './mock-tms.controller';

@Module({
  controllers: [MockTmsController],
})
export class MockTmsModule {}
