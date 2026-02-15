import { Module } from '@nestjs/common';

/**
 * AI Infrastructure Module
 * Provides shared AI utilities (LLM providers, document processing)
 * to all AI domain submodules.
 *
 * Note: The Anthropic provider is a plain TypeScript export (not a NestJS injectable)
 * because the Vercel AI SDK uses functional patterns — generateObject() takes a model directly.
 */
@Module({})
export class AiInfrastructureModule {}
