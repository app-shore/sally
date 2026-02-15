import { Module, Global } from '@nestjs/common';

/**
 * AI Infrastructure Module
 * Provides shared AI utilities (LLM providers, document processing)
 * to all AI domain submodules.
 */
@Global()
@Module({})
export class AiInfrastructureModule {}
