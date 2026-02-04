import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtTokenService } from './jwt.service';
import {
  LoginDto,
  UserProfileDto,
  TenantDto,
  UserSummaryDto,
  UserLookupDto,
  UserLookupResponseDto,
  UserLookupResultDto,
} from './dto/login.dto';
import { FirebaseExchangeDto } from './dto/firebase-exchange.dto';
import { FirebaseAuthService } from './firebase-auth.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtTokenService: JwtTokenService,
    private firebaseAuthService: FirebaseAuthService,
  ) {}

  /**
   * Lookup user by email or phone (for simplified login flow)
   */
  async lookupUser(lookupDto: UserLookupDto): Promise<UserLookupResponseDto> {
    if (!lookupDto.email && !lookupDto.phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const where: any = { isActive: true };

    if (lookupDto.email) {
      where.email = lookupDto.email.toLowerCase().trim();
    }

    if (lookupDto.phone) {
      where.phone = lookupDto.phone.trim();
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        tenant: true,
        driver: true,
      },
      orderBy: [
        { tenant: { companyName: 'asc' } },
        { role: 'asc' },
        { firstName: 'asc' },
      ],
    });

    if (users.length === 0) {
      throw new NotFoundException('No user found with this email or phone');
    }

    return {
      users: users.map((u) => ({
        userId: u.userId,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        tenantId: u.tenant.tenantId,
        tenantName: u.tenant.companyName,
        driverId: u.driver?.driverId,
        driverName: u.driver?.name,
      })),
      multiTenant: users.length > 1,
    };
  }

  /**
   * Mock login - finds pre-seeded user and generates JWT tokens
   * Updated to support optional tenant_id (userId is globally unique)
   */
  async loginMock(loginDto: LoginDto) {
    // Find user by globally unique userId
    const user = await this.prisma.user.findUnique({
      where: {
        userId: loginDto.user_id,
      },
      include: {
        tenant: true,
        driver: true,
      },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('User not found or inactive');
    }

    // Validate tenant is active
    if (!user.tenant.isActive) {
      throw new UnauthorizedException('Tenant is not active');
    }

    // If tenant_id was provided (backward compatibility), validate it matches
    if (loginDto.tenant_id && user.tenant.tenantId !== loginDto.tenant_id) {
      throw new NotFoundException('User not found for this tenant');
    }

    // Generate JWT tokens
    const tokens = await this.jwtTokenService.generateTokenPair({
      id: user.id,
      userId: user.userId,
      email: user.email,
      role: user.role,
      tenantId: user.tenant.tenantId,
      driverId: user.driver?.driverId,
    });

    // Update last login timestamp
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
   * Exchange Firebase token for SALLY JWT
   */
  async exchangeFirebaseToken(dto: FirebaseExchangeDto) {
    // Verify Firebase token
    const decodedToken = await this.firebaseAuthService.verifyFirebaseToken(
      dto.firebaseToken,
    );

    // Find user by Firebase UID
    const user = await this.firebaseAuthService.findOrCreateUserByFirebaseUid(
      decodedToken.uid,
      decodedToken.email,
    );

    if (!user) {
      throw new UnauthorizedException(
        'User not found. Please complete registration.',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is deactivated. Please contact support.',
      );
    }

    if (user.tenant && user.tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Your organization account is pending approval. Please check back later.',
      );
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate SALLY JWT tokens
    const { accessToken, refreshToken } =
      await this.jwtTokenService.generateTokenPair({
        id: user.id,
        userId: user.userId,
        email: user.email,
        role: user.role,
        tenantId: user.tenant?.tenantId,
        driverId: user.driver?.driverId,
      });

    return {
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenant?.tenantId,
        tenantName: user.tenant?.companyName,
        driverId: user.driver?.driverId,
      },
    };
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
