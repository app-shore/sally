import { Controller, Get, Post, Param, Query, Body, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { SallyAiService } from './sally-ai.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Sally AI Conversations')
@Controller('conversations')
export class SallyAiController {
  constructor(private readonly service: SallyAiService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  @ApiOperation({ summary: 'Create a new Sally AI conversation' })
  async createConversation(
    @CurrentUser() user: any,
    @Body() dto: CreateConversationDto,
  ) {
    return this.service.createConversation(user.userId, user.tenantDbId, dto.userMode);
  }

  @Post(':conversationId/messages')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  @ApiOperation({ summary: 'Send a message and get Sally AI response' })
  async sendMessage(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.sendMessage(
      conversationId,
      dto.content,
      dto.inputMode,
      user.userId,
      user.tenantDbId,
    );
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  @ApiOperation({ summary: 'List conversations for the current user' })
  async listConversations(
    @CurrentUser() user: any,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.service.listConversations(user.userId, user.tenantDbId, limit);
  }

  @Get(':conversationId/messages')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  @ApiOperation({ summary: 'Get messages for a conversation (view-only history)' })
  async getMessages(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
  ) {
    return this.service.getMessages(conversationId, user.userId, user.tenantDbId);
  }
}
