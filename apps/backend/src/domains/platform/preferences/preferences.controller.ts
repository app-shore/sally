import { Controller, Get, Put, Body } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('users/me/preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  async getPreferences(@CurrentUser() user: any) {
    return this.preferencesService.getPreferences(user.id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Put()
  async updatePreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(user.id, dto);
  }
}
