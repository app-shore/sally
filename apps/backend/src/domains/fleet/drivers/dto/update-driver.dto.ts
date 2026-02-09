import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateDriverDto {
  @ApiProperty({
    example: 'John Smith',
    description: 'Driver full name',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'DL12345678',
    description: 'Driver license number',
    required: false,
  })
  @IsString()
  @IsOptional()
  license_number?: string;

  @ApiProperty({
    example: '555-123-4567',
    description: 'Driver phone number',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Driver email address',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;
}
