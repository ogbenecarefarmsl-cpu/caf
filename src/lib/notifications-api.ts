import apiClient from './api-client';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppNotification {
  _id: string;
  userId: string;
  branchId?: string;
  type: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  link?: string;
  resourceId?: string;
  resourceType?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export const notificationsApi = {
  async list(opts: { limit?: number; unreadOnly?: boolean } = {}): Promise<AppNotification[]> {
    const params: Record<string, string | number | boolean> = {};
    if (opts.limit) params.limit = opts.limit;
    if (opts.unreadOnly) params.unreadOnly = 'true';
    const res = await apiClient.get<AppNotification[]>('/notifications', { params });
    return res.data;
  },

  async unreadCount(): Promise<number> {
    const res = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return res.data.count;
  },

  async markRead(id: string): Promise<AppNotification> {
    const res = await apiClient.patch<AppNotification>(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllRead(): Promise<number> {
    const res = await apiClient.post<{ modified: number }>('/notifications/read-all');
    return res.data.modified;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },
};
