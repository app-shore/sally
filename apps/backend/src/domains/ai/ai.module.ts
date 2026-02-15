import { Module } from '@nestjs/common';
import { AiInfrastructureModule } from './infrastructure/ai-infrastructure.module';
import { DocumentIntelligenceModule } from './document-intelligence/document-intelligence.module';
import { SallyAiModule } from './sally-ai/sally-ai.module';

/**
 * AI Domain Module — aggregates all AI-related functionality.
 *
 * Submodules:
 * - Infrastructure: Shared LLM providers (Anthropic, future OpenAI)
 * - Document Intelligence: PDF parsing (ratecon, future BOL/POD)
 * - Sally AI: Conversational assistant (intent classification, response generation)
 */
@Module({
  imports: [AiInfrastructureModule, DocumentIntelligenceModule, SallyAiModule],
  exports: [DocumentIntelligenceModule, SallyAiModule],
})
export class AiModule {}
