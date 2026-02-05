import { Module } from '@nestjs/common';
import { ExternalMockController } from './external-mock.controller';

@Module({
  controllers: [ExternalMockController],
})
export class ExternalMockModule {}
