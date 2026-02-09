import { create } from 'zustand';
import type { ChatMessage, OrbState, UserMode, LeadData, InputMode, Intent } from './engine/types';
import { classifyIntent } from './engine/intent-classifier';
import { generateResponse } from './engine/response-generator';
import {
  createConversation as createConversationApi,
  sendMessageApi,
  listConversations,
  getConversationMessages,
  type ConversationSummary,
  type MessageResponse,
} from './api';

interface SallyState {
  // Strip state
  isOpen: boolean;
  isExpanded: boolean;

  // Session
  sessionId: string | null;
  messages: ChatMessage[];

  // Voice
  orbState: OrbState;
  isVoiceEnabled: boolean;
  isTTSEnabled: boolean;
  isMicActive: boolean;
  interimTranscript: string;

  // User context
  userMode: UserMode;

  // Lead capture (prospect mode)
  leadData: LeadData | null;
  leadCaptureStep: number;

  // Chat history
  pastConversations: ConversationSummary[];
  isViewingHistory: boolean;
  viewedMessages: ChatMessage[];
  isLoadingHistory: boolean;

  // Actions
  toggleStrip: () => void;
  expandStrip: () => void;
  collapseStrip: () => void;
  setUserMode: (mode: UserMode) => void;
  sendMessage: (content: string, inputMode: InputMode) => void;
  setOrbState: (state: OrbState) => void;
  toggleTTS: () => void;
  toggleMic: () => void;
  setMicActive: (active: boolean) => void;
  setInterimTranscript: (text: string) => void;
  clearSession: () => void;
  loadHistory: () => Promise<void>;
  viewConversation: (conversationId: string) => Promise<void>;
  clearView: () => void;
}

function createSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getGreeting(mode: UserMode): string {
  switch (mode) {
    case 'prospect':
      return "Hi! I'm SALLY. I can tell you about our fleet operations platform, pricing, integrations, or set up a demo. What would you like to know?";
    case 'dispatcher':
      return "Hi! I'm SALLY. I can check alerts, look up drivers, query routes, and manage your fleet. What do you need?";
    case 'driver':
      return "Hey! I'm SALLY. I can show your route, check HOS, report delays, or find fuel. What's up?";
  }
}

function createInitialMessage(mode: UserMode): ChatMessage {
  return {
    id: 'initial',
    role: 'assistant',
    content: getGreeting(mode),
    inputMode: 'text',
    timestamp: new Date(),
    speakText: getGreeting(mode),
  };
}

function apiMessageToChatMessage(msg: MessageResponse, role: 'user' | 'assistant'): ChatMessage {
  return {
    id: msg.messageId,
    role,
    content: msg.content,
    inputMode: msg.inputMode as InputMode,
    timestamp: new Date(msg.createdAt),
    intent: msg.intent as Intent | undefined,
    card: msg.card,
    action: msg.action,
    speakText: msg.speakText,
  };
}

async function initConversationViaApi(mode: UserMode): Promise<{ sessionId: string; messages: ChatMessage[] } | null> {
  if (mode === 'prospect') return null;
  try {
    const res = await createConversationApi(mode);
    const greeting: ChatMessage = {
      id: res.greeting.messageId,
      role: 'assistant',
      content: res.greeting.content,
      inputMode: 'text',
      timestamp: new Date(res.greeting.createdAt),
      speakText: res.greeting.speakText,
    };
    return { sessionId: res.conversationId, messages: [greeting] };
  } catch {
    // Fallback to frontend-only if API fails
    return null;
  }
}

export const useSallyStore = create<SallyState>((set, get) => ({
  // Initial state
  isOpen: false,
  isExpanded: false,
  sessionId: null,
  messages: [],
  orbState: 'idle',
  isVoiceEnabled: false,
  isTTSEnabled: false,
  isMicActive: false,
  interimTranscript: '',
  userMode: 'prospect',
  leadData: null,
  leadCaptureStep: 0,
  pastConversations: [],
  isViewingHistory: false,
  viewedMessages: [],
  isLoadingHistory: false,

  toggleStrip: () => {
    const state = get();
    const nextOpen = !state.isOpen;
    if (nextOpen && !state.sessionId) {
      if (state.userMode === 'prospect') {
        set({
          isOpen: true,
          isExpanded: true,
          sessionId: createSessionId(),
          messages: [createInitialMessage(state.userMode)],
        });
      } else {
        // Start with loading state, then create via API
        set({ isOpen: true, isExpanded: true, orbState: 'thinking' });
        initConversationViaApi(state.userMode).then(result => {
          if (result) {
            set({ sessionId: result.sessionId, messages: result.messages, orbState: 'idle' });
          } else {
            set({
              sessionId: createSessionId(),
              messages: [createInitialMessage(state.userMode)],
              orbState: 'idle',
            });
          }
        });
      }
      return;
    }
    set({ isOpen: nextOpen, isExpanded: nextOpen ? state.isExpanded : false });
  },

  expandStrip: () => {
    const state = get();
    if (!state.sessionId) {
      if (state.userMode === 'prospect') {
        set({
          isExpanded: true,
          isOpen: true,
          sessionId: createSessionId(),
          messages: [createInitialMessage(state.userMode)],
        });
      } else {
        set({ isExpanded: true, isOpen: true, orbState: 'thinking' });
        initConversationViaApi(state.userMode).then(result => {
          if (result) {
            set({ sessionId: result.sessionId, messages: result.messages, orbState: 'idle' });
          } else {
            set({
              sessionId: createSessionId(),
              messages: [createInitialMessage(state.userMode)],
              orbState: 'idle',
            });
          }
        });
      }
      return;
    }
    set({ isExpanded: true, isOpen: true });
  },

  collapseStrip: () => set({ isExpanded: false }),

  setUserMode: (mode) => set(state => {
    if (mode === state.userMode) return {};
    return {
      userMode: mode,
      sessionId: null,
      messages: [],
      leadData: null,
      leadCaptureStep: 0,
      isTTSEnabled: mode === 'driver',
      isVoiceEnabled: mode !== 'prospect',
      pastConversations: [],
      isViewingHistory: false,
      viewedMessages: [],
    };
  }),

  sendMessage: (content, inputMode) => {
    const state = get();

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      inputMode,
      timestamp: new Date(),
    };

    set(s => ({
      messages: [...s.messages, userMessage],
      orbState: 'thinking' as OrbState,
      interimTranscript: '',
    }));

    if (state.userMode === 'prospect') {
      // Prospect mode: frontend-only (no auth, no API)
      const delay = 300 + Math.random() * 500;
      setTimeout(() => {
        const currentState = get();
        const classified = classifyIntent(content, currentState.userMode);
        const response = generateResponse(classified, currentState.userMode);

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: response.text + (response.followUp ? `\n\n${response.followUp}` : ''),
          inputMode: 'text',
          timestamp: new Date(),
          intent: classified.intent,
          card: response.card,
          action: response.action,
          speakText: response.speakText,
        };

        set(s => ({
          messages: [...s.messages, assistantMessage],
          orbState: 'idle' as OrbState,
        }));
      }, delay);
    } else {
      // Dispatcher/Driver mode: call backend API
      const sessionId = state.sessionId;
      if (!sessionId) return;

      sendMessageApi(sessionId, content, inputMode)
        .then(res => {
          // Update user message ID from backend
          const assistantMsg = apiMessageToChatMessage(res.assistantMessage, 'assistant');

          set(s => {
            // Replace the optimistic user message with backend-confirmed one
            const msgs = [...s.messages];
            const lastUserIdx = msgs.length - 1;
            if (msgs[lastUserIdx]?.role === 'user') {
              msgs[lastUserIdx] = {
                ...msgs[lastUserIdx],
                id: res.userMessage.messageId,
              };
            }
            return {
              messages: [...msgs, assistantMsg],
              orbState: 'idle' as OrbState,
            };
          });
        })
        .catch(() => {
          // Fallback to frontend engine on API error
          const classified = classifyIntent(content, state.userMode);
          const response = generateResponse(classified, state.userMode);

          const assistantMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: response.text + (response.followUp ? `\n\n${response.followUp}` : ''),
            inputMode: 'text',
            timestamp: new Date(),
            intent: classified.intent,
            card: response.card,
            action: response.action,
            speakText: response.speakText,
          };

          set(s => ({
            messages: [...s.messages, assistantMessage],
            orbState: 'idle' as OrbState,
          }));
        });
    }
  },

  setOrbState: (orbState) => set({ orbState }),
  toggleTTS: () => set(state => ({ isTTSEnabled: !state.isTTSEnabled })),
  toggleMic: () => set(state => ({ isMicActive: !state.isMicActive })),
  setMicActive: (active) => set({ isMicActive: active }),
  setInterimTranscript: (text) => set({ interimTranscript: text }),

  clearSession: () => set({
    sessionId: null,
    messages: [],
    orbState: 'idle',
    isMicActive: false,
    interimTranscript: '',
    leadData: null,
    leadCaptureStep: 0,
    isViewingHistory: false,
    viewedMessages: [],
  }),

  loadHistory: async () => {
    const state = get();
    if (state.userMode === 'prospect') return;

    set({ isLoadingHistory: true });
    try {
      const res = await listConversations(10);
      set({ pastConversations: res.conversations, isLoadingHistory: false });
    } catch {
      set({ isLoadingHistory: false });
    }
  },

  viewConversation: async (conversationId: string) => {
    set({ isLoadingHistory: true });
    try {
      const res = await getConversationMessages(conversationId);
      const messages: ChatMessage[] = res.messages.map(m => ({
        id: m.messageId,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        inputMode: m.inputMode as InputMode,
        timestamp: new Date(m.createdAt),
        intent: m.intent as Intent | undefined,
        card: m.card as any,
        action: m.action as any,
        speakText: m.speakText ?? undefined,
      }));
      set({ isViewingHistory: true, viewedMessages: messages, isLoadingHistory: false });
    } catch {
      set({ isLoadingHistory: false });
    }
  },

  clearView: () => set({ isViewingHistory: false, viewedMessages: [] }),
}));
