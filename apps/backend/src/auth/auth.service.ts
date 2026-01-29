import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtTokenService } from './jwt.service';
import { LoginDto, UserProfileDto, TenantDto, UserSummaryDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtTokenService: JwtTokenService,
  ) {}

  /**
   * Mock login - finds pre-seeded user and generates JWT tokens
   */
  async loginMock(loginDto: LoginDto) {
    // 1. Validate tenant exists and is active
    const tenant = await this.prisma.tenant.findUnique({
      where: {
        tenantId: loginDto.tenant_id,
        isActive: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found or inactive');
    }

    // 2. Find pre-seeded user
    const user = await this.prisma.user.findFirst({
      where: {
        userId: loginDto.user_id,
        tenant: {
          tenantId: loginDto.tenant_id,
        },
        isActive: true,
      },
      include: {
        tenant: true,
        driver: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found for this tenant');
    }

    // 3. Generate JWT tokens
    const tokens = await this.jwtTokenService.generateTokenPair({
      id: user.id,
      userId: user.userId,
      email: user.email,
      role: user.role,
      tenantId: tenant.tenantId,
      driverId: user.driver?.driverId,
    });

    // 4. Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toUserProfile(user),
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(userId: string, tokenId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        tenant: true,
        driver: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate new access token (refresh token remains valid)
    const accessToken = await this.jwtTokenService.generateTokenPair({
      id: user.id,
      userId: user.userId,
      email: user.email,
      role: user.role,
      tenantId: user.tenant.tenantId,
      driverId: user.driver?.driverId,
    });

    return {
      accessToken: accessToken.accessToken,
      user: this.toUserProfile(user),
    };
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(tokenId: string): Promise<void> {
    await this.jwtTokenService.revokeRefreshToken(tokenId);
  }

  /**
   * Get user profile by userId
   */
  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        tenant: true,
        driver: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserProfile(user);
  }

  /**
   * List all available tenants (for login screen)
   */
  async listTenants(): Promise<TenantDto[]> {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      orderBy: { companyName: 'asc' },
    });

    return tenants.map((t) => ({
      tenantId: t.tenantId,
      companyName: t.companyName,
      subdomain: t.subdomain,
      isActive: t.isActive,
    }));
  }

  /**
   * List users for a tenant (optionally filtered by role)
   * Used in login screen for user selection
   */
  async listUsersForTenant(
    tenantId: string,
    role?: UserRole,
  ): Promise<UserSummaryDto[]> {
    const users = await this.prisma.user.findMany({
      where: {
        tenant: {
          tenantId,
        },
        isActive: true,
        ...(role && { role }),
      },
      include: {
        driver: true,
      },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    });

    return users.map((u) => ({
      userId: u.userId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      driverId: u.driver?.driverId,
      driverName: u.driver?.name,
    }));
  }

  /**
   * Helper: Convert User entity to UserProfileDto
   */
  private toUserProfile(user: any): UserProfileDto {
    return {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenant.tenantId,
      tenantName: user.tenant.companyName,
      driverId: user.driver?.driverId,
      driverName: user.driver?.name,
      isActive: user.isActive,
    };
  }
}
