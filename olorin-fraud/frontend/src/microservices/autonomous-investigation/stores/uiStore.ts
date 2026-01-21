/**
 * UI Store
 * Manages overall UI state including panels, modals, and layout
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface PanelState {
  isOpen: boolean;
  width?: number;
  height?: number;
}

interface UIState {
  // Panel states
  panels: {
    sidebar: PanelState;
    evidencePanel: PanelState;
    domainPanel: PanelState;
    timelinePanel: PanelState;
    detailsPanel: PanelState;
  };

  // Modal states
  modals: {
    createInvestigation: boolean;
    investigationSettings: boolean;
    exportModal: boolean;
    helpModal: boolean;
  };

  // Layout states
  layout: {
    sidebarCollapsed: boolean;
    fullscreenMode: boolean;
    splitView: boolean;
    activeView: 'graph' | 'timeline' | 'evidence' | 'domains';
  };

  // Notification system
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: number;
    autoHide?: boolean;
    duration?: number;
  }>;

  // Loading states
  loading: {
    global: boolean;
    investigation: boolean;
    graph: boolean;
    evidence: boolean;
    domains: boolean;
  };

  // Actions
  togglePanel: (panel: keyof UIState['panels']) => void;
  setPanelSize: (panel: keyof UIState['panels'], size: { width?: number; height?: number }) => void;
  closeAllPanels: () => void;

  toggleModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;

  updateLayout: (layout: Partial<UIState['layout']>) => void;
  toggleSidebar: () => void;
  toggleFullscreen: () => void;
  setActiveView: (view: UIState['layout']['activeView']) => void;

  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  setLoading: (key: keyof UIState['loading'], loading: boolean) => void;
  setGlobalLoading: (loading: boolean) => void;
}

const initialPanelState: PanelState = {
  isOpen: false,
  width: 300,
  height: 400,
};

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        panels: {
          sidebar: { ...initialPanelState, isOpen: true, width: 280 },
          evidencePanel: { ...initialPanelState, height: 300 },
          domainPanel: { ...initialPanelState, height: 200 },
          timelinePanel: { ...initialPanelState, height: 150 },
          detailsPanel: { ...initialPanelState, width: 350 },
        },

        modals: {
          createInvestigation: false,
          investigationSettings: false,
          exportModal: false,
          helpModal: false,
        },

        layout: {
          sidebarCollapsed: false,
          fullscreenMode: false,
          splitView: false,
          activeView: 'graph',
        },

        notifications: [],

        loading: {
          global: false,
          investigation: false,
          graph: false,
          evidence: false,
          domains: false,
        },

        // Panel actions
        togglePanel: (panel) =>
          set((state) => ({
            panels: {
              ...state.panels,
              [panel]: {
                ...state.panels[panel],
                isOpen: !state.panels[panel].isOpen,
              },
            },
          })),

        setPanelSize: (panel, size) =>
          set((state) => ({
            panels: {
              ...state.panels,
              [panel]: {
                ...state.panels[panel],
                ...size,
              },
            },
          })),

        closeAllPanels: () =>
          set((state) => {
            const panels = { ...state.panels };
            Object.keys(panels).forEach((key) => {
              panels[key as keyof typeof panels].isOpen = false;
            });
            return { panels };
          }),

        // Modal actions
        toggleModal: (modal) =>
          set((state) => ({
            modals: {
              ...state.modals,
              [modal]: !state.modals[modal],
            },
          })),

        closeAllModals: () =>
          set({
            modals: {
              createInvestigation: false,
              investigationSettings: false,
              exportModal: false,
              helpModal: false,
            },
          }),

        // Layout actions
        updateLayout: (layoutUpdate) =>
          set((state) => ({
            layout: { ...state.layout, ...layoutUpdate },
          })),

        toggleSidebar: () =>
          set((state) => ({
            layout: {
              ...state.layout,
              sidebarCollapsed: !state.layout.sidebarCollapsed,
            },
          })),

        toggleFullscreen: () =>
          set((state) => ({
            layout: {
              ...state.layout,
              fullscreenMode: !state.layout.fullscreenMode,
            },
          })),

        setActiveView: (view) =>
          set((state) => ({
            layout: { ...state.layout, activeView: view },
          })),

        // Notification actions
        addNotification: (notification) => {
          const id = Math.random().toString(36).substr(2, 9);
          const newNotification = {
            ...notification,
            id,
            timestamp: Date.now(),
            autoHide: notification.autoHide ?? true,
            duration: notification.duration ?? 5000,
          };

          set((state) => ({
            notifications: [...state.notifications, newNotification],
          }));

          // Auto-remove notification if autoHide is enabled
          if (newNotification.autoHide) {
            setTimeout(() => {
              get().removeNotification(id);
            }, newNotification.duration);
          }
        },

        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          })),

        clearNotifications: () => set({ notifications: [] }),

        // Loading actions
        setLoading: (key, loading) =>
          set((state) => ({
            loading: { ...state.loading, [key]: loading },
          })),

        setGlobalLoading: (loading) =>
          set((state) => ({
            loading: { ...state.loading, global: loading },
          })),
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          panels: state.panels,
          layout: state.layout,
        }),
      }
    ),
    {
      name: 'ui-store',
    }
  )
);

// Computed selectors
export const usePanelStates = () => useUIStore((state) => state.panels);
export const useModalStates = () => useUIStore((state) => state.modals);
export const useLayoutState = () => useUIStore((state) => state.layout);
export const useNotifications = () => useUIStore((state) => state.notifications);
export const useLoadingStates = () => useUIStore((state) => state.loading);

// Individual panel selectors
export const useSidebarPanel = () => useUIStore((state) => state.panels.sidebar);
export const useEvidencePanel = () => useUIStore((state) => state.panels.evidencePanel);
export const useDomainPanel = () => useUIStore((state) => state.panels.domainPanel);
export const useTimelinePanel = () => useUIStore((state) => state.panels.timelinePanel);
export const useDetailsPanel = () => useUIStore((state) => state.panels.detailsPanel);

// Individual modal selectors
export const useCreateInvestigationModal = () =>
  useUIStore((state) => state.modals.createInvestigation);
export const useInvestigationSettingsModal = () =>
  useUIStore((state) => state.modals.investigationSettings);
export const useExportModal = () => useUIStore((state) => state.modals.exportModal);
export const useHelpModal = () => useUIStore((state) => state.modals.helpModal);

// Action selectors
export const useUIActions = () =>
  useUIStore((state) => ({
    togglePanel: state.togglePanel,
    setPanelSize: state.setPanelSize,
    closeAllPanels: state.closeAllPanels,
    toggleModal: state.toggleModal,
    closeAllModals: state.closeAllModals,
    updateLayout: state.updateLayout,
    toggleSidebar: state.toggleSidebar,
    toggleFullscreen: state.toggleFullscreen,
    setActiveView: state.setActiveView,
    addNotification: state.addNotification,
    removeNotification: state.removeNotification,
    clearNotifications: state.clearNotifications,
    setLoading: state.setLoading,
    setGlobalLoading: state.setGlobalLoading,
  }));