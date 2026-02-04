import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsEnum,
  Matches,
} from 'class-validator';
import { FleetSize } from '@prisma/client';

export class RegisterTenantDto {
  // Company information
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Subdomain must contain only lowercase letters, numbers, and hyphens',
  })
  subdomain: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, { message: 'DOT number must be exactly 8 digits' })
  dotNumber: string;

  @IsEnum(FleetSize)
  fleetSize: FleetSize;

  // Admin user information
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firebaseUid: string;

  // Contact information
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CheckSubdomainDto {
  @IsString()
  @IsNotEmpty()
  subdomain: string;
}
