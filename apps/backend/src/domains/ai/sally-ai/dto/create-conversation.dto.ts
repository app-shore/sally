import { IsNotEmpty, IsIn } from 'class-validator';

export class CreateConversationDto {
  @IsNotEmpty()
  @IsIn(['dispatcher', 'driver'])
  userMode: string;
}
