import { create } from 'zustand';

interface ChatStore {
  isOpen: boolean;
  isDocked: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setIsDocked: (isDocked: boolean) => void;
  toggleChat: () => void;
  toggleDock: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  isOpen: false,
  isDocked: true, // Always docked to right (no floating mode)
  setIsOpen: (isOpen) => set({ isOpen }),
  setIsDocked: (isDocked) => set({ isDocked }),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  toggleDock: () => set((state) => ({ isDocked: !state.isDocked })),
}));
