import { ApiProperty } from '@nestjs/swagger';

export class ApiKeyDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'sk_staging_abc123...', description: 'API key (only shown once on creation)' })
  key?: string;

  @ApiProperty({ example: 'Production API Key' })
  name: string;

  @ApiProperty({ example: 0 })
  requestCount: number;

  @ApiProperty({ example: '2026-02-05T10:30:00Z', nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-02-05T08:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: null, nullable: true })
  expiresAt: Date | null;
}
