import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { generateId } from '../../../shared/utils/id-generator';
import { classifyIntent } from './engine/intent-classifier';
import { generateResponse, getGreeting } from './engine/response-generator';

@Injectable()
export class SallyAiService {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(userId: number, tenantId: number, userMode: string) {
    const conversationId = generateId('conv');
    const greetingMessageId = generateId('msg');
    const greetingText = getGreeting(userMode);

    const conversation = await this.prisma.conversation.create({
      data: {
        conversationId,
        tenantId,
        userId,
        userMode,
        messages: {
          create: {
            messageId: greetingMessageId,
            role: 'assistant',
            content: greetingText,
            inputMode: 'text',
            speakText: greetingText,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    const greeting = conversation.messages[0];

    return {
      conversationId: conversation.conversationId,
      userMode: conversation.userMode,
      createdAt: conversation.createdAt.toISOString(),
      greeting: {
        messageId: greeting.messageId,
        role: greeting.role,
        content: greeting.content,
        inputMode: greeting.inputMode,
        speakText: greeting.speakText,
        createdAt: greeting.createdAt.toISOString(),
      },
    };
  }

  async sendMessage(
    conversationId: string,
    content: string,
    inputMode: string,
    userId: number,
    tenantId: number,
  ) {
    // Find and verify ownership
    const conversation = await this.prisma.conversation.findUnique({
      where: { conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    if (conversation.userId !== userId || conversation.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    // Store user message
    const userMessageId = generateId('msg');
    const userMessage = await this.prisma.conversationMessage.create({
      data: {
        messageId: userMessageId,
        conversationId: conversation.id,
        role: 'user',
        content,
        inputMode,
      },
    });

    // Classify intent and generate response
    const classified = classifyIntent(content, conversation.userMode);
    const response = generateResponse(classified, conversation.userMode);

    // Build assistant message content
    const assistantContent = response.text + (response.followUp ? `\n\n${response.followUp}` : '');

    // Store assistant message
    const assistantMessageId = generateId('msg');
    const assistantMessage = await this.prisma.conversationMessage.create({
      data: {
        messageId: assistantMessageId,
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantContent,
        inputMode: 'text',
        intent: classified.intent,
        card: response.card ? (response.card as any) : undefined,
        action: response.action ? (response.action as any) : undefined,
        speakText: response.speakText,
      },
    });

    // Auto-set title from first user message (if not yet set)
    if (!conversation.title) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: content.slice(0, 100) },
      });
    }

    return {
      userMessage: {
        messageId: userMessage.messageId,
        role: userMessage.role,
        content: userMessage.content,
        inputMode: userMessage.inputMode,
        createdAt: userMessage.createdAt.toISOString(),
      },
      assistantMessage: {
        messageId: assistantMessage.messageId,
        role: assistantMessage.role,
        content: assistantMessage.content,
        inputMode: assistantMessage.inputMode,
        intent: assistantMessage.intent,
        card: assistantMessage.card,
        action: assistantMessage.action,
        speakText: assistantMessage.speakText,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
    };
  }

  async listConversations(userId: number, tenantId: number, limit: number = 10) {
    const conversations = await this.prisma.conversation.findMany({
      where: { userId, tenantId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    return {
      conversations: conversations.map(c => ({
        conversationId: c.conversationId,
        userMode: c.userMode,
        title: c.title,
        messageCount: c._count.messages,
        lastMessageAt: c.messages[0]?.createdAt.toISOString() ?? c.createdAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async getMessages(conversationId: string, userId: number, tenantId: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    if (conversation.userId !== userId || conversation.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return {
      conversationId: conversation.conversationId,
      userMode: conversation.userMode,
      title: conversation.title,
      messages: conversation.messages.map(m => ({
        messageId: m.messageId,
        role: m.role,
        content: m.content,
        inputMode: m.inputMode,
        intent: m.intent,
        card: m.card,
        action: m.action,
        speakText: m.speakText,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }
}
