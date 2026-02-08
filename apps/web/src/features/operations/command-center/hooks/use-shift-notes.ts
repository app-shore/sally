import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commandCenterApi } from '../api';

const SHIFT_NOTES_KEY = ['command-center', 'shift-notes'] as const;

export function useShiftNotes() {
  return useQuery({
    queryKey: [...SHIFT_NOTES_KEY],
    queryFn: () => commandCenterApi.getShiftNotes(),
    refetchInterval: 60000, // Poll every 60 seconds
  });
}

export function useCreateShiftNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, isPinned }: { content: string; isPinned?: boolean }) =>
      commandCenterApi.createShiftNote(content, isPinned),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHIFT_NOTES_KEY }),
  });
}

export function useTogglePinShiftNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => commandCenterApi.togglePinShiftNote(noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHIFT_NOTES_KEY }),
  });
}

export function useDeleteShiftNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => commandCenterApi.deleteShiftNote(noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHIFT_NOTES_KEY }),
  });
}
