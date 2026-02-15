import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  Length,
} from 'class-validator';

export class CreateDriverDto {
  @ApiProperty({ example: 'John Doe', description: 'Driver full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '555-123-4567', description: 'Driver phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'john@example.com', description: 'Driver email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'A', description: 'CDL classification', enum: ['A', 'B', 'C'] })
  @IsEnum(['A', 'B', 'C'], { message: 'cdl_class must be A, B, or C' })
  @IsNotEmpty()
  cdl_class: string;

  @ApiProperty({ example: 'DL12345678', description: 'Driver license number' })
  @IsString()
  @IsNotEmpty()
  license_number: string;

  @ApiProperty({ example: 'TX', description: 'License issuing state (2-letter)', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  license_state?: string;
}
