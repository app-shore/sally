import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(UserRole)
  role: UserRole;

  /**
   * Optional tenant ID (required for SUPER_ADMIN inviting users)
   * For ADMIN users, this is automatically set to their tenant
   */
  @IsOptional()
  @IsNumber()
  tenantId?: number;

  /**
   * Optional driver ID to link (for DRIVER role only)
   * Used when inviting a user account for an existing driver
   */
  @IsOptional()
  @IsString()
  driverId?: string;
}

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  firebaseUid: string;
}
