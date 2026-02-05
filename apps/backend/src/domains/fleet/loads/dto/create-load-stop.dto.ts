import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateLoadStopDto {
  @ApiProperty({
    example: 'STOP-001',
    description: 'Stop identifier',
  })
  @IsString()
  @IsNotEmpty()
  stop_id: string;

  @ApiProperty({
    example: 1,
    description: 'Sequence order of stop in the load',
  })
  @IsNumber()
  sequence_order: number;

  @ApiProperty({
    example: 'PICKUP',
    description: 'Action type at stop (PICKUP, DELIVERY)',
  })
  @IsString()
  @IsNotEmpty()
  action_type: string;

  @ApiProperty({
    example: '2026-02-05T08:00:00Z',
    description: 'Earliest arrival time',
    required: false,
  })
  @IsString()
  @IsOptional()
  earliest_arrival?: string;

  @ApiProperty({
    example: '2026-02-05T17:00:00Z',
    description: 'Latest arrival time',
    required: false,
  })
  @IsString()
  @IsOptional()
  latest_arrival?: string;

  @ApiProperty({
    example: 2.5,
    description: 'Estimated dock hours at this stop',
  })
  @IsNumber()
  estimated_dock_hours: number;
}
