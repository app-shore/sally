import { apiClient } from '@/shared/lib/api';
import type { CommandCenterOverview, ShiftNote } from './types';

export const commandCenterApi = {
  getOverview: async (): Promise<CommandCenterOverview> => {
    return apiClient<CommandCenterOverview>('/command-center/overview');
  },

  getShiftNotes: async (): Promise<{ notes: ShiftNote[] }> => {
    return apiClient<{ notes: ShiftNote[] }>('/command-center/shift-notes');
  },

  createShiftNote: async (content: string, isPinned?: boolean): Promise<ShiftNote> => {
    return apiClient<ShiftNote>('/command-center/shift-notes', {
      method: 'POST',
      body: JSON.stringify({ content, isPinned }),
    });
  },

  deleteShiftNote: async (noteId: string): Promise<void> => {
    await apiClient(`/command-center/shift-notes/${noteId}`, {
      method: 'DELETE',
    });
  },
};
