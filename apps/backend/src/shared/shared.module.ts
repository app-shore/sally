import { Global, Module } from '@nestjs/common';
import { ExternalSourceGuard } from './guards/external-source.guard';

/**
 * SharedModule provides common utilities, base classes, guards, and filters
 * that are used across multiple domains.
 *
 * This module is marked as @Global() so it's available everywhere without
 * explicit imports in every module.
 *
 * Exports:
 * - ExternalSourceGuard: Guard to prevent modification of external resources
 * - BaseTenantController: Base controller with tenant utilities (imported directly)
 * - HttpExceptionFilter: Global exception filter (registered in AppModule)
 */
@Global()
@Module({
  providers: [ExternalSourceGuard],
  exports: [ExternalSourceGuard],
})
export class SharedModule {}
