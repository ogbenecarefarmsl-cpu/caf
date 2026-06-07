import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNotificationStore } from '../stores/notification-store';
import { useAuthStore } from '../stores/auth-store';
import { notificationsApi, type AppNotification } from '../lib/notifications-api';

const severityStyles: Record<string, { bg: string; ring: string; icon: string; label: string }> = {
  info: { bg: 'bg-blue-500/10', ring: 'ring-blue-500/30', icon: 'text-blue-400', label: 'Info' },
  warning: { bg: 'bg-yellow-500/10', ring: 'ring-yellow-500/30', icon: 'text-yellow-400', label: 'Warning' },
  error: { bg: 'bg-orange-500/10', ring: 'ring-orange-500/30', icon: 'text-orange-400', label: 'Error' },
  critical: { bg: 'bg-red-500/10', ring: 'ring-red-500/30', icon: 'text-red-400', label: 'Critical' },
};

function timeAgo(iso: string): string {
  try {
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    if (diff < 0 || Number.isNaN(diff)) return '';
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    if (d < 7) return `${d}d ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { unreadCount, hasNew, increment, setUnreadCount, clearHasNew } = useNotificationStore();

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'list', open ? 50 : 0],
    queryFn: () => notificationsApi.list({ limit: 50 }),
    enabled: isAuthenticated && open,
    refetchInterval: open ? 30_000 : false,
  });

  // Poll unread count every 60s
  useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const count = await notificationsApi.unreadCount();
      setUnreadCount(count);
      return count;
    },
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      setUnreadCount(0);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Listen for new notifications via custom event dispatched from useWebSocket
  useEffect(() => {
    const onNew = () => increment();
    window.addEventListener('app:notification-new', onNew as EventListener);
    return () => window.removeEventListener('app:notification-new', onNew as EventListener);
  }, [increment]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        clearHasNew();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, clearHasNew]);

  const handleClickItem = useCallback(
    (n: AppNotification) => {
      if (!n.read) markReadMutation.mutate(n._id);
      if (n.link) {
        setOpen(false);
        clearHasNew();
        navigate(n.link);
      }
    },
    [markReadMutation, navigate, clearHasNew],
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) clearHasNew();
        }}
        className="relative w-10 h-10 rounded-xl bg-primary-dark border border-gray-700 flex items-center justify-center text-gray-300 hover:border-accent-green/50 hover:text-accent-green transition-colors"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 ${hasNew ? 'animate-pulse text-accent-green' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-1.5rem)] bg-primary-dark border border-gray-700 rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-primary-darker">
            <div>
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              <p className="text-xs text-gray-400">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs text-accent-green hover:text-accent-light font-medium disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 opacity-30" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => {
                const style = severityStyles[n.severity] ?? severityStyles.info;
                return (
                  <div
                    key={n._id}
                    onClick={() => handleClickItem(n)}
                    className={`group relative flex items-start gap-3 p-3 border-b border-gray-800 cursor-pointer hover:bg-primary-darker transition-colors ${
                      !n.read ? 'bg-accent-green/5' : ''
                    }`}
                  >
                    {!n.read && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent-green" />
                    )}
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ring-1 ${style.bg} ${style.ring}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${style.icon}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white truncate">{n.title}</p>
                        <span className="text-[10px] text-gray-500 shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-300 mt-0.5 whitespace-normal break-words">{n.message}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMutation.mutate(n._id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs"
                      title="Dismiss"
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
