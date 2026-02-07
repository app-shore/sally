import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';

@ApiTags('Notification Preferences')
@Controller('preferences/notifications')
export class NotificationPreferencesController {
  constructor(private readonly service: NotificationPreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notification preferences' })
  async getPreferences(@CurrentUser() user: any) {
    return this.service.getPreferences(user.id, user.tenantDbId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user notification preferences' })
  async updatePreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.service.updatePreferences(user.id, user.tenantDbId, dto);
  }
}
