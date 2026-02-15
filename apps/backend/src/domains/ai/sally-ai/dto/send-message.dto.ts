import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsIn(['text', 'voice'])
  inputMode: string;
}
