import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({
    example: 'Production API Key',
    description: 'Human-readable name for the API key'
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
