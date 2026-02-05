import { Module } from '@nestjs/common';
import { ExternalApisController } from './external-apis.controller';

@Module({
  controllers: [ExternalApisController],
})
export class ExternalApisModule {}
