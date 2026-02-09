import { apiClient } from '@/shared/lib/api';

// ── Response Types ──

export interface ConversationGreeting {
  messageId: string;
  role: string;
  content: string;
  inputMode: string;
  speakText?: string;
  createdAt: string;
}

export interface CreateConversationResponse {
  conversationId: string;
  userMode: string;
  createdAt: string;
  greeting: ConversationGreeting;
}

export interface MessageResponse {
  messageId: string;
  role: string;
  content: string;
  inputMode: string;
  intent?: string;
  card?: any;
  action?: any;
  speakText?: string;
  createdAt: string;
}

export interface SendMessageResponse {
  userMessage: MessageResponse;
  assistantMessage: MessageResponse;
}

export interface ConversationSummary {
  conversationId: string;
  userMode: string;
  title: string | null;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface ListConversationsResponse {
  conversations: ConversationSummary[];
}

export interface GetMessagesResponse {
  conversationId: string;
  userMode: string;
  title: string | null;
  messages: MessageResponse[];
}

// ── API Functions ──

export async function createConversation(userMode: string): Promise<CreateConversationResponse> {
  return apiClient<CreateConversationResponse>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ userMode }),
  });
}

export async function sendMessageApi(
  conversationId: string,
  content: string,
  inputMode: string,
): Promise<SendMessageResponse> {
  return apiClient<SendMessageResponse>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, inputMode }),
  });
}

export async function listConversations(limit: number = 10): Promise<ListConversationsResponse> {
  return apiClient<ListConversationsResponse>(`/conversations?limit=${limit}`);
}

export async function getConversationMessages(conversationId: string): Promise<GetMessagesResponse> {
  return apiClient<GetMessagesResponse>(`/conversations/${conversationId}/messages`);
}
