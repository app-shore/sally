import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateDriverDto {
  @ApiProperty({
    example: 'DRV-001',
    description: 'Unique driver identifier',
  })
  @IsString()
  @IsNotEmpty()
  driver_id: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Driver full name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
