import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateDriverDto {
  @ApiProperty({
    example: 'John Smith',
    description: 'Driver full name',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;
}
