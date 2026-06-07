import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  hasNew: boolean;
  setUnreadCount: (n: number) => void;
  increment: () => void;
  clearHasNew: () => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  hasNew: false,
  setUnreadCount: (n) => set({ unreadCount: n, hasNew: false }),
  increment: () =>
    set((s) => ({ unreadCount: s.unreadCount + 1, hasNew: true })),
  clearHasNew: () => set({ hasNew: false }),
  reset: () => set({ unreadCount: 0, hasNew: false }),
}));
