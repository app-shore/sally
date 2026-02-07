import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

// Super Admin preferences (platform-level)
import { SuperAdminPreferencesController } from './super-admin-preferences.controller';
import { SuperAdminPreferencesService } from './super-admin-preferences.service';

// User preferences (per-user display/notification settings)
import { UserPreferencesController } from './user-preferences.controller';
import { UserPreferencesService } from './user-preferences.service';

// Operations settings (per-tenant fleet configuration)
import { OperationsSettingsController } from './operations-settings.controller';
import { OperationsSettingsService } from './operations-settings.service';

// Alert configuration (per-tenant alert thresholds, escalation, channels)
import { AlertConfigController } from './alert-config.controller';
import { AlertConfigService } from './alert-config.service';

// Notification preferences (per-user sound, browser, tab flash settings)
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    SuperAdminPreferencesController,
    UserPreferencesController,
    OperationsSettingsController,
    AlertConfigController,
    NotificationPreferencesController,
  ],
  providers: [
    SuperAdminPreferencesService,
    UserPreferencesService,
    OperationsSettingsService,
    AlertConfigService,
    NotificationPreferencesService,
  ],
  exports: [
    SuperAdminPreferencesService,
    UserPreferencesService,
    OperationsSettingsService,
    AlertConfigService,
    NotificationPreferencesService,
  ],
})
export class PreferencesModule {}
