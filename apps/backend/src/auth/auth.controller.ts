import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Res,
  Query,
  Param,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  LoginResponseDto,
  UserProfileDto,
  TenantDto,
  UserSummaryDto,
} from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Get('tenants')
  @ApiOperation({ summary: 'List available tenants (fleet companies)' })
  @ApiResponse({ status: 200, description: 'List of tenants', type: [TenantDto] })
  async listTenants(): Promise<TenantDto[]> {
    return this.authService.listTenants();
  }

  @Public()
  @Get('tenants/:tenant_id/users')
  @ApiOperation({ summary: 'List users for a tenant (for login user selection)' })
  @ApiResponse({ status: 200, description: 'List of users', type: [UserSummaryDto] })
  async listUsersForTenant(
    @Param('tenant_id') tenantId: string,
    @Query('role') role?: UserRole,
  ): Promise<UserSummaryDto[]> {
    return this.authService.listUsersForTenant(tenantId, role);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login (mock authentication for POC)' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant or user not found' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.loginMock(loginDto);

    // Set httpOnly cookie for refresh token
    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return access token and user profile (refresh token is in cookie)
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @UseGuards(RefreshJwtAuthGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'New access token generated',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@CurrentUser() user: any) {
    const result = await this.authService.refreshAccessToken(
      user.userId,
      user.tokenId,
    );

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (user.tokenId) {
      await this.authService.logout(user.tokenId);
    }

    // Clear refresh token cookie
    response.clearCookie('refreshToken');

    return { message: 'Logout successful' };
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile',
    type: UserProfileDto,
  })
  async getProfile(@CurrentUser() user: any): Promise<UserProfileDto> {
    return this.authService.getProfile(user.userId);
  }
}
