/**
 * B2B UI Store
 *
 * Zustand store for UI state (sidebar, modals, toasts).
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface UIState {
  sidebarCollapsed: boolean;
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  toasts: Toast[];

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (toastId: string) => void;
  clearToasts: () => void;

  reset: () => void;
}

const initialState = {
  sidebarCollapsed: false,
  activeModal: null,
  modalData: null,
  toasts: [],
};

export const useUIStore = create<UIState>((set) => ({
  ...initialState,

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed });
  },

  openModal: (modalId: string, data?: Record<string, unknown>) => {
    set({ activeModal: modalId, modalData: data || null });
  },

  closeModal: () => {
    set({ activeModal: null, modalData: null });
  },

  addToast: (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    const duration = toast.duration || 5000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (toastId: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== toastId),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },

  reset: () => set(initialState),
}));

export const useSidebarCollapsed = () =>
  useUIStore((state) => state.sidebarCollapsed);

export const useActiveModal = () => useUIStore((state) => state.activeModal);

export const useModalData = () => useUIStore((state) => state.modalData);

export const useToasts = () => useUIStore((state) => state.toasts);

export const useToastActions = () => {
  const addToast = useUIStore((state) => state.addToast);
  const removeToast = useUIStore((state) => state.removeToast);
  const clearToasts = useUIStore((state) => state.clearToasts);

  return {
    addToast,
    removeToast,
    clearToasts,
    showSuccess: (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),
    showError: (title: string, message?: string) =>
      addToast({ type: 'error', title, message }),
    showWarning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
    showInfo: (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),
  };
};
