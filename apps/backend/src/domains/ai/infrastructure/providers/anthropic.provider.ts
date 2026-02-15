import { createAnthropic } from '@ai-sdk/anthropic';

/**
 * Shared Anthropic provider instance for all AI features.
 * Uses ANTHROPIC_API_KEY from environment.
 */
export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Default model for structured output / document parsing.
 * Claude Sonnet 4 balances cost, speed, and accuracy for document extraction.
 */
export const DEFAULT_MODEL = anthropic('claude-sonnet-4-20250514');
