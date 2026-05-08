import { create } from 'zustand';
import api from '@/services/api';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  related_entity_type?: string;
  related_entity_id?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationState {
  notifications: Notification[];
  toasts: Toast[];
  isDrawerOpen: boolean;
  isLoading: boolean;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'> & { id?: string; timestamp?: string }) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => void;
  
  addToast: (message: string, type?: NotificationType) => void;
  removeToast: (id: string) => void;
  
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  toasts: [],
  isDrawerOpen: false,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/notifications');
      // Map backend fields to frontend fields
      const mapped = response.data.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.body,
        type: n.type,
        timestamp: n.created_at,
        read: n.is_read,
        related_entity_type: n.related_entity_type,
        related_entity_id: n.related_entity_id,
      }));
      set({ notifications: mapped });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  addNotification: (notification) => {
    const id = notification.id || Math.random().toString(36).substring(7);
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: notification.timestamp || new Date().toISOString(),
      read: false,
    };
    
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
    }));

    // Also show a toast for new notifications
    get().addToast(notification.message, notification.type);
  },

  markAsRead: async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`, { is_read: true });
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      }));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      await api.post('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      }));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  clearNotifications: () =>
    set(() => ({
      notifications: [],
    })),

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setDrawerOpen: (open) => {
    set({ isDrawerOpen: open });
    if (open) {
      get().fetchNotifications();
    }
  },
  
  toggleDrawer: () => {
    const nextOpen = !get().isDrawerOpen;
    set({ isDrawerOpen: nextOpen });
    if (nextOpen) {
      get().fetchNotifications();
    }
  },
}));
