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

@Module({
  imports: [PrismaModule],
  controllers: [
    SuperAdminPreferencesController,
    UserPreferencesController,
    OperationsSettingsController,
  ],
  providers: [
    SuperAdminPreferencesService,
    UserPreferencesService,
    OperationsSettingsService,
  ],
  exports: [
    SuperAdminPreferencesService,
    UserPreferencesService,
    OperationsSettingsService,
  ],
})
export class PreferencesModule {}
