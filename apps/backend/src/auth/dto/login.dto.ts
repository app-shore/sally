import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Tenant ID (company identifier)',
    example: 'swift_transport',
  })
  @IsString()
  @IsNotEmpty()
  tenant_id: string;

  @ApiProperty({
    description: 'User ID for pre-seeded user',
    example: 'user_swift_disp_001',
  })
  @IsString()
  @IsNotEmpty()
  user_id: string;
}

export class UserProfileDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ enum: ['DISPATCHER', 'DRIVER', 'ADMIN'] })
  role: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  tenantName: string;

  @ApiProperty({ required: false })
  driverId?: string;

  @ApiProperty({ required: false })
  driverName?: string;

  @ApiProperty()
  isActive: boolean;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'User profile information' })
  user: UserProfileDto;
}

export class TenantDto {
  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty({ required: false })
  subdomain?: string;

  @ApiProperty()
  isActive: boolean;
}

export class UserSummaryDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  role: string;

  @ApiProperty({ required: false })
  driverId?: string;

  @ApiProperty({ required: false })
  driverName?: string;
}
