import { ApiProperty } from '@nestjs/swagger';

export class FeatureFlagDto {
  @ApiProperty({ example: 'route_planning_enabled' })
  key: string;

  @ApiProperty({ example: 'Route Planning' })
  name: string;

  @ApiProperty({ example: 'Intelligent route planning with HOS compliance', required: false })
  description?: string;

  @ApiProperty({ example: false })
  enabled: boolean;

  @ApiProperty({ example: 'dispatcher' })
  category: string;
}

export class FeatureFlagsResponse {
  @ApiProperty({ type: [FeatureFlagDto] })
  flags: FeatureFlagDto[];
}
