/**
 * Notification Store
 * Zustand store for managing notification state with deduplication and priority
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Notification, NotificationOptions } from '../native/components/GlassToast/types';

const MAX_QUEUE_SIZE = 10;
const DEDUPLICATION_WINDOW_MS = 1000;

const PRIORITY_MAP: Record<string, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  success: 3,
  error: 4,
};

interface NotificationStore {
  notifications: Notification[];
  deferredQueue: Notification[];
  isProviderMounted: boolean;

  add: (notification: NotificationOptions) => string;
  remove: (id: string) => void;
  clear: () => void;
  clearByLevel: (level: string) => void;
  setProviderMounted: (mounted: boolean) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  deferredQueue: [],
  isProviderMounted: false,

  add: (notification: NotificationOptions) => {
    const id = nanoid(10);
    const priority = PRIORITY_MAP[notification.level] || 1;

    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: Date.now(),
      priority,
      duration: notification.duration ?? (notification.level === 'error' ? 5000 : 3000),
      dismissable: notification.dismissable ?? true,
    };

    // Deduplication check
    const existing = get().notifications.find(
      (n) =>
        n.message === notification.message &&
        n.level === notification.level &&
        Date.now() - n.createdAt < DEDUPLICATION_WINDOW_MS
    );

    if (existing) {
      return existing.id;
    }

    set((state) => {
      // Provider not mounted yet - defer
      if (!state.isProviderMounted) {
        return {
          deferredQueue: [...state.deferredQueue, newNotification],
        };
      }

      // FIFO eviction if max size reached
      let notifications = [...state.notifications, newNotification];
      if (notifications.length > MAX_QUEUE_SIZE) {
        notifications = notifications.slice(-MAX_QUEUE_SIZE);
      }

      // Sort by priority (errors first)
      notifications.sort((a, b) => b.priority - a.priority);

      return { notifications };
    });

    return id;
  },

  remove: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clear: () => {
    set({ notifications: [] });
  },

  clearByLevel: (level: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.level !== level),
    }));
  },

  setProviderMounted: (mounted: boolean) => {
    set({ isProviderMounted: mounted });

    // Process deferred queue when provider mounts
    if (mounted) {
      const { deferredQueue, add } = get();
      deferredQueue.forEach((notification) => {
        add(notification);
      });
      set({ deferredQueue: [] });
    }
  },
}));
