import { Global, Module } from '@nestjs/common';
import { MessagingGateway } from './messaging.gateway';
import { PrismaModule } from '../database/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [MessagingGateway],
  exports: [MessagingGateway],
})
export class WebSocketModule {}
