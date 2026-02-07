import { IsArray, IsOptional, IsString, ArrayMinSize } from 'class-validator';

export class BulkAcknowledgeDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  alertIds: string[];
}

export class BulkResolveDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  alertIds: string[];

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
