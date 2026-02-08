import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class CreateShiftNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
