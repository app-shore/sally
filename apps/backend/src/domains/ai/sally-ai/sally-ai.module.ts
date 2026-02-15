import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { SallyAiController } from './sally-ai.controller';
import { SallyAiService } from './sally-ai.service';

/**
 * SallyAiModule handles Sally AI chat conversations:
 * - Create conversations with mode-specific greetings
 * - Send messages and receive mock AI responses
 * - List past conversations for history view
 * - Retrieve conversation messages (view-only)
 */
@Module({
  imports: [PrismaModule],
  controllers: [SallyAiController],
  providers: [SallyAiService],
  exports: [SallyAiService],
})
export class SallyAiModule {}
