import { Module } from '@nestjs/common';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { UserInvitationsModule } from './user-invitations/user-invitations.module';
import { PreferencesModule } from './preferences/preferences.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ApiKeysModule } from './api-keys/api-keys.module';

/**
 * PlatformModule aggregates all platform/infrastructure modules:
 * - Tenants: Multi-tenancy management
 * - Users: User management and authentication
 * - User Invitations: User invitation system
 * - Preferences: User and tenant preferences
 * - Feature Flags: Feature flag management
 * - Onboarding: User onboarding flows
 * - API Keys: API key management for external developers
 */
@Module({
  imports: [
    TenantsModule,
    UsersModule,
    UserInvitationsModule,
    PreferencesModule,
    FeatureFlagsModule,
    OnboardingModule,
    ApiKeysModule,
  ],
  exports: [
    TenantsModule,
    UsersModule,
    UserInvitationsModule,
    PreferencesModule,
    FeatureFlagsModule,
    OnboardingModule,
    ApiKeysModule,
  ],
})
export class PlatformModule {}
