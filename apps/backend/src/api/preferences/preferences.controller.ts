import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { UpdateUserPreferencesDto } from './dto/user-preferences.dto';
import { UpdateOperationsSettingsDto } from './dto/operations-settings.dto';
import { UpdateDriverPreferencesDto } from './dto/driver-preferences.dto';

@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  // ============================================================================
  // USER PREFERENCES
  // ============================================================================

  @Get('user')
  async getUserPreferences(@Req() req: any) {
    const userId = req.user.userId;
    return this.preferencesService.getUserPreferences(userId);
  }

  @Put('user')
  async updateUserPreferences(
    @Req() req: any,
    @Body() dto: UpdateUserPreferencesDto,
  ) {
    const userId = req.user.userId;
    return this.preferencesService.updateUserPreferences(userId, dto);
  }

  // ============================================================================
  // OPERATIONS SETTINGS
  // ============================================================================

  @Get('operations')
  async getOperationsSettings(@Req() req: any) {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const tenantId = req.user.tenantId;
    return this.preferencesService.getOperationsSettings(
      userId,
      userRole,
      tenantId,
    );
  }

  @Put('operations')
  async updateOperationsSettings(
    @Req() req: any,
    @Body() dto: UpdateOperationsSettingsDto,
  ) {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const tenantId = req.user.tenantId;
    return this.preferencesService.updateOperationsSettings(
      userId,
      userRole,
      tenantId,
      dto,
    );
  }

  // ============================================================================
  // DRIVER PREFERENCES
  // ============================================================================

  @Get('driver')
  async getDriverPreferences(@Req() req: any) {
    const userId = req.user.userId;
    const userRole = req.user.role;
    return this.preferencesService.getDriverPreferences(userId, userRole);
  }

  @Put('driver')
  async updateDriverPreferences(
    @Req() req: any,
    @Body() dto: UpdateDriverPreferencesDto,
  ) {
    const userId = req.user.userId;
    const userRole = req.user.role;
    return this.preferencesService.updateDriverPreferences(
      userId,
      userRole,
      dto,
    );
  }

  // ============================================================================
  // RESET TO DEFAULTS
  // ============================================================================

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetToDefaults(
    @Req() req: any,
    @Body() body: { scope: 'user' | 'operations' | 'driver' },
  ) {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const tenantId = req.user.tenantId;
    return this.preferencesService.resetToDefaults(
      userId,
      tenantId,
      body.scope,
      userRole,
    );
  }

  // ============================================================================
  // GET SYSTEM DEFAULTS
  // ============================================================================

  @Get('defaults')
  async getDefaults() {
    return {
      user: {
        distanceUnit: 'MILES',
        timeFormat: '12H',
        temperatureUnit: 'F',
        currency: 'USD',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        autoRefreshInterval: 30,
        defaultView: 'OVERVIEW',
        compactMode: false,
        highContrastMode: false,
        alertMethods: [],
        minAlertPriority: 'MEDIUM',
        alertCategories: ['hos', 'delay', 'route', 'vehicle', 'weather'],
        quietHoursStart: null,
        quietHoursEnd: null,
        emailDigestFrequency: 'NEVER',
        desktopNotifications: true,
        soundEnabled: true,
        emailNotifications: false,
        smsNotifications: false,
        fontSize: 'MEDIUM',
        reduceMotion: false,
        screenReaderOptimized: false,
      },
      operations: {
        defaultDriveHours: 0.0,
        defaultOnDutyHours: 0.0,
        defaultSinceBreakHours: 0.0,
        driveHoursWarningPct: 75,
        driveHoursCriticalPct: 90,
        onDutyWarningPct: 75,
        onDutyCriticalPct: 90,
        sinceBreakWarningPct: 75,
        sinceBreakCriticalPct: 90,
        defaultOptimizationMode: 'BALANCE',
        costPerMile: 1.85,
        laborCostPerHour: 25.0,
        preferFullRest: true,
        restStopBuffer: 30,
        allowDockRest: true,
        minRestDuration: 7,
        fuelPriceThreshold: 0.15,
        maxFuelDetour: 10,
        minFuelSavings: 10.0,
        defaultLoadAssignment: 'MANUAL',
        defaultDriverSelection: 'AUTO_SUGGEST',
        defaultVehicleSelection: 'AUTO_ASSIGN',
        delayThresholdMinutes: 30,
        hosApproachingPct: 85,
        costOverrunPct: 10,
        reportTimezone: 'America/New_York',
        includeMapInReports: true,
        reportEmailRecipients: [],
      },
      driver: {
        preferredRestStops: [],
        preferredFuelStops: [],
        preferredBreakDuration: 30,
        breakReminderAdvance: 30,
        timelineView: 'VERTICAL',
        showRestReasoning: true,
        showCostDetails: false,
        largeTextMode: false,
        offlineMode: false,
        dataUsageMode: 'NORMAL',
        emergencyContact: null,
        preferredContactMethod: 'IN_APP',
        languagePreference: 'en',
      },
    };
  }
}
