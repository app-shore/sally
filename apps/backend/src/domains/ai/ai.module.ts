import { Module } from '@nestjs/common';
import { AiInfrastructureModule } from './infrastructure/ai-infrastructure.module';
import { DocumentIntelligenceModule } from './document-intelligence/document-intelligence.module';

/**
 * AI Domain Module — aggregates all AI-related functionality.
 *
 * Submodules:
 * - Infrastructure: Shared LLM providers (Anthropic, future OpenAI)
 * - Document Intelligence: PDF parsing (ratecon, future BOL/POD)
 */
@Module({
  imports: [AiInfrastructureModule, DocumentIntelligenceModule],
  exports: [DocumentIntelligenceModule],
})
export class AiModule {}
