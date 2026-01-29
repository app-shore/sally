import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
  tenantId: string;
  driverId?: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    // Validate that user still exists and is active
    const user = await this.prisma.user.findUnique({
      where: { userId: payload.sub },
      include: {
        tenant: true,
        driver: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (!user.tenant.isActive) {
      throw new UnauthorizedException('Tenant is inactive');
    }

    // Return user object that will be attached to request
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
      tenantId: user.tenant.tenantId,
      tenantName: user.tenant.companyName,
      driverId: user.driver?.driverId,
      driverName: user.driver?.name,
      isActive: user.isActive,
    };
  }
}
