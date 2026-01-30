import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Res,
  Query,
  Param,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  LoginResponseDto,
  UserProfileDto,
  TenantDto,
  UserSummaryDto,
  UserLookupDto,
  UserLookupResponseDto,
} from './dto/login.dto';
import { FirebaseExchangeDto } from './dto/firebase-exchange.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Public()
  @Post('lookup-user')
  @ApiOperation({
    summary: 'Lookup user by email or phone to detect tenant(s)',
    description: 'Used for simplified login flow - returns user(s) with tenant information',
  })
  @ApiBody({ type: UserLookupDto })
  @ApiResponse({
    status: 200,
    description: 'User(s) found',
    type: UserLookupResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No user found with this email/phone' })
  async lookupUser(@Body() lookupDto: UserLookupDto): Promise<UserLookupResponseDto> {
    return this.authService.lookupUser(lookupDto);
  }

  @Public()
  @Get('tenants')
  @ApiOperation({
    summary: 'List available tenants (fleet companies)',
    deprecated: true,
    description: 'DEPRECATED: Use POST /auth/lookup-user instead for simplified login flow',
  })
  @ApiResponse({ status: 200, description: 'List of tenants', type: [TenantDto] })
  async listTenants(): Promise<TenantDto[]> {
    this.logger.warn('[DEPRECATED] GET /auth/tenants is deprecated. Use POST /auth/lookup-user instead.');
    return this.authService.listTenants();
  }

  @Public()
  @Get('tenants/:tenant_id/users')
  @ApiOperation({
    summary: 'List users for a tenant (for login user selection)',
    deprecated: true,
    description: 'DEPRECATED: Use POST /auth/lookup-user instead for simplified login flow',
  })
  @ApiResponse({ status: 200, description: 'List of users', type: [UserSummaryDto] })
  async listUsersForTenant(
    @Param('tenant_id') tenantId: string,
    @Query('role') role?: UserRole,
  ): Promise<UserSummaryDto[]> {
    this.logger.warn('[DEPRECATED] GET /auth/tenants/:tenant_id/users is deprecated. Use POST /auth/lookup-user instead.');
    return this.authService.listUsersForTenant(tenantId, role);
  }

  @Public()
  @Post('firebase/exchange')
  @ApiOperation({
    summary: 'Exchange Firebase token for SALLY JWT',
    description: 'Verifies Firebase ID token and returns SALLY JWT tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Token exchange successful',
  })
  @ApiResponse({ status: 401, description: 'Invalid Firebase token or user not found' })
  async exchangeFirebaseToken(@Body() dto: FirebaseExchangeDto) {
    return this.authService.exchangeFirebaseToken(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Login (mock authentication for POC)',
    description: 'Login with user_id. tenant_id is optional (userId is globally unique)',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
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
