import { IsString, IsEmail, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
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
