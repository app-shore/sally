import { create } from 'zustand';
import type { ChatMessage, OrbState, UserMode, LeadData, InputMode } from './engine/types';
import { classifyIntent } from './engine/intent-classifier';
import { generateResponse } from './engine/response-generator';

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

  toggleStrip: () => set(state => {
    const nextOpen = !state.isOpen;
    if (nextOpen && !state.sessionId) {
      return {
        isOpen: true,
        isExpanded: true,
        sessionId: createSessionId(),
        messages: [createInitialMessage(state.userMode)],
      };
    }
    return { isOpen: nextOpen, isExpanded: nextOpen ? state.isExpanded : false };
  }),

  expandStrip: () => set(state => {
    if (!state.sessionId) {
      return {
        isExpanded: true,
        isOpen: true,
        sessionId: createSessionId(),
        messages: [createInitialMessage(state.userMode)],
      };
    }
    return { isExpanded: true, isOpen: true };
  }),

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
    };
  }),

  sendMessage: (content, inputMode) => {
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
  }),
}));
