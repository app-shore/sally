import { Module } from '@nestjs/common';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { UserInvitationsModule } from './user-invitations/user-invitations.module';
import { SettingsModule } from './settings/settings.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { SallyAiModule } from './sally-ai/sally-ai.module';

/**
 * PlatformModule aggregates all platform/infrastructure modules:
 * - Tenants: Multi-tenancy management
 * - Users: User management and authentication
 * - User Invitations: User invitation system
 * - Settings: User and tenant settings/preferences
 * - Feature Flags: Feature flag management
 * - Onboarding: User onboarding flows
 * - API Keys: API key management for external developers
 * - Sally AI: AI assistant conversations and chat history
 */
@Module({
  imports: [
    TenantsModule,
    UsersModule,
    UserInvitationsModule,
    SettingsModule,
    FeatureFlagsModule,
    OnboardingModule,
    ApiKeysModule,
    SallyAiModule,
  ],
  exports: [
    TenantsModule,
    UsersModule,
    UserInvitationsModule,
    SettingsModule,
    FeatureFlagsModule,
    OnboardingModule,
    ApiKeysModule,
    SallyAiModule,
  ],
})
export class PlatformModule {}
