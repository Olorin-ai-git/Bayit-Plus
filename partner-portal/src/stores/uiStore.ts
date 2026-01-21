/**
 * B2B UI Store
 *
 * Zustand store for UI state management (sidebar, modals, toasts).
 */

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ModalState {
  isOpen: boolean;
  type: string | null;
  data: Record<string, unknown> | null;
}

interface UIState {
  // Sidebar
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Modal
  modal: ModalState;
  openModal: (type: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Toasts
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Loading overlay
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Theme (for future use)
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

let toastIdCounter = 0;

function generateToastId(): string {
  toastIdCounter += 1;
  return `toast-${Date.now()}-${toastIdCounter}`;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Sidebar state
  isSidebarOpen: true,
  isSidebarCollapsed: false,

  toggleSidebar: () => {
    const { isSidebarOpen } = get();
    set({ isSidebarOpen: !isSidebarOpen });
  },

  setSidebarOpen: (open: boolean) => set({ isSidebarOpen: open }),

  setSidebarCollapsed: (collapsed: boolean) => set({ isSidebarCollapsed: collapsed }),

  // Modal state
  modal: {
    isOpen: false,
    type: null,
    data: null,
  },

  openModal: (type: string, data?: Record<string, unknown>) => {
    set({
      modal: {
        isOpen: true,
        type,
        data: data ?? null,
      },
    });
  },

  closeModal: () => {
    set({
      modal: {
        isOpen: false,
        type: null,
        data: null,
      },
    });
  },

  // Toast state
  toasts: [],

  addToast: (type: ToastType, message: string, duration = 5000) => {
    const id = generateToastId();
    const toast: Toast = { id, type, message, duration };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => set({ toasts: [] }),

  // Global loading
  isGlobalLoading: false,
  setGlobalLoading: (loading: boolean) => set({ isGlobalLoading: loading }),

  // Theme
  theme: 'dark',
  setTheme: (theme: 'dark' | 'light') => set({ theme }),
}));

// Helper functions for toasts
export const toast = {
  success: (message: string, duration?: number) => {
    useUIStore.getState().addToast('success', message, duration);
  },
  error: (message: string, duration?: number) => {
    useUIStore.getState().addToast('error', message, duration);
  },
  warning: (message: string, duration?: number) => {
    useUIStore.getState().addToast('warning', message, duration);
  },
  info: (message: string, duration?: number) => {
    useUIStore.getState().addToast('info', message, duration);
  },
};
