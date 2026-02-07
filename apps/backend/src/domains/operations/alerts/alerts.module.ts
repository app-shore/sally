import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertService } from './services/alert.service';
import { AlertStatsService } from './services/alert-stats.service';
import { AlertGroupingService } from './services/alert-grouping.service';
import { EscalationService } from './services/escalation.service';
import { AutoResolutionService } from './services/auto-resolution.service';
import { AlertGenerationService } from './services/alert-generation.service';
import { AlertAnalyticsService } from './services/alert-analytics.service';
import { AlertDigestService } from './services/alert-digest.service';
import { AlertTriggersService } from './services/alert-triggers.service';
import { AlertCacheService } from './services/alert-cache.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { NotificationModule } from '../../../infrastructure/notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [AlertsController],
  providers: [
    AlertService,
    AlertStatsService,
    AlertGroupingService,
    EscalationService,
    AutoResolutionService,
    AlertGenerationService,
    AlertAnalyticsService,
    AlertDigestService,
    AlertTriggersService,
    AlertCacheService,
  ],
  exports: [
    AlertService,
    AlertStatsService,
    AlertGroupingService,
    EscalationService,
    AutoResolutionService,
    AlertGenerationService,
    AlertAnalyticsService,
    AlertTriggersService,
    AlertCacheService,
  ],
})
export class AlertsModule {}
