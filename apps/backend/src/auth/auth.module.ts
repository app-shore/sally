import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';
import { FirebaseAuthService } from './firebase-auth.service';
import { PrismaModule } from '../infrastructure/database/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('jwt.accessSecret') || 'default-secret',
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiry') || '15m',
        } as any,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtTokenService,
    JwtStrategy,
    RefreshJwtStrategy,
    FirebaseAuthService,
  ],
  exports: [AuthService, JwtTokenService, FirebaseAuthService],
})
export class AuthModule {}
