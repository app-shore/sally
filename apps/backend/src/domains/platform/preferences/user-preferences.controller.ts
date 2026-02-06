import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { UserPreferencesService } from './user-preferences.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UpdateUserPreferencesDto } from './dto/user-preferences.dto';
import { UpdateDriverPreferencesDto } from './dto/driver-preferences.dto';

@Controller('preferences')
export class UserPreferencesController {
  constructor(
    private readonly userPreferencesService: UserPreferencesService,
  ) {}

  // GET /preferences/user
  @Get('user')
  async getUserPreferences(@CurrentUser() user: any) {
    return this.userPreferencesService.getUserPreferences(user.userId);
  }

  // PUT /preferences/user
  @Put('user')
  async updateUserPreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdateUserPreferencesDto,
  ) {
    return this.userPreferencesService.updateUserPreferences(user.userId, dto);
  }

  // GET /preferences/driver
  @Get('driver')
  async getDriverPreferences(@CurrentUser() user: any) {
    return this.userPreferencesService.getDriverPreferences(user.userId);
  }

  // PUT /preferences/driver
  @Put('driver')
  async updateDriverPreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdateDriverPreferencesDto,
  ) {
    return this.userPreferencesService.updateDriverPreferences(
      user.userId,
      dto,
    );
  }

  // POST /preferences/reset
  @Post('reset')
  async resetToDefaults(
    @CurrentUser() user: any,
    @Body() body: { scope: 'user' | 'driver' },
  ) {
    return this.userPreferencesService.resetToDefaults(
      user.userId,
      body.scope,
    );
  }
}
