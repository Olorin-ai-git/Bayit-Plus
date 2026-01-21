/**
 * PiP Widget Store
 * Mobile-specific widget state management with PiP capabilities
 * Extends web widgetStore pattern with mobile-specific state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Widget types (from shared)
export interface Widget {
  id: string;
  type: 'system' | 'personal';
  user_id?: string;
  title: string;
  description?: string;
  icon?: string;
  content: WidgetContent;
  position: WidgetPosition;
  is_active: boolean;
  is_muted: boolean;
  is_visible: boolean;
  is_closable: boolean;
  is_draggable: boolean;
  visible_to_roles: string[];
  visible_to_subscription_tiers: string[];
  target_pages: string[];
  order: number;
  cover_url?: string;
  created_at: string;
  updated_at: string;
}

export interface WidgetContent {
  content_type: 'live_channel' | 'live' | 'podcast' | 'vod' | 'radio' | 'iframe' | 'custom';
  channel_id?: string;
  podcast_id?: string;
  station_id?: string;
  vod_id?: string;
  iframe_url?: string;
  iframe_title?: string;
  component_name?: string;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
}

// Mobile-specific widget state
export type PiPWidgetState = 'full' | 'minimized' | 'expanded';
export type SnappedEdge = 'left' | 'right' | 'top' | 'bottom' | null;

interface WidgetLocalState {
  [widgetId: string]: {
    isMuted: boolean;
    isVisible: boolean;
    position: WidgetPosition;
    state: PiPWidgetState;
    isSnapped: boolean;
    snappedEdge: SnappedEdge;
  };
}

interface PiPWidgetStoreState {
  // Widgets loaded from backend
  widgets: Widget[];
  isLoading: boolean;
  error: string | null;

  // Local state per widget (persisted to AsyncStorage)
  localState: WidgetLocalState;

  // Mobile-specific: Only one audio widget active at a time
  activeAudioWidget: string | null;

  // Actions - Data fetching
  setWidgets: (widgets: Widget[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Widget state
  toggleMute: (widgetId: string) => void;
  closeWidget: (widgetId: string) => void;
  showWidget: (widgetId: string) => void;
  minimizeWidget: (widgetId: string) => void;
  expandWidget: (widgetId: string) => void;
  updatePosition: (widgetId: string, position: Partial<WidgetPosition>) => void;
  snapToEdge: (widgetId: string, edge: SnappedEdge) => void;
  setActiveAudio: (widgetId: string | null) => void;

  // Actions - CRUD
  addWidget: (widget: Widget) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<Widget>) => void;

  // Selectors
  getWidgetState: (widgetId: string) => any;
  getVisibleWidgets: () => Widget[];
}

export const usePiPWidgetStore = create<PiPWidgetStoreState>()(
  persist(
    (set, get) => ({
      widgets: [],
      isLoading: false,
      error: null,
      localState: {},
      activeAudioWidget: null,

      setWidgets: (newWidgets) => {
        const currentState = get().localState;
        const currentWidgets = get().widgets;
        const newLocalState = { ...currentState };

        // Preserve cover_url from existing widgets
        const widgetsWithPreservedData = newWidgets.map((widget) => {
          const existing = currentWidgets.find((w) => w.id === widget.id);
          if (existing?.cover_url && !widget.cover_url) {
            return { ...widget, cover_url: existing.cover_url };
          }
          return widget;
        });

        // Initialize local state for new widgets
        widgetsWithPreservedData.forEach((widget) => {
          if (!newLocalState[widget.id]) {
            newLocalState[widget.id] = {
              isMuted: widget.is_muted,
              isVisible: widget.is_visible,
              position: widget.position,
              state: 'full',
              isSnapped: false,
              snappedEdge: null,
            };
          }
        });

        set({ widgets: widgetsWithPreservedData, localState: newLocalState, error: null });
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      toggleMute: (widgetId) => {
        const { localState } = get();
        const widgetState = localState[widgetId];
        if (widgetState) {
          set({
            localState: {
              ...localState,
              [widgetId]: {
                ...widgetState,
                isMuted: !widgetState.isMuted,
              },
            },
          });
        }
      },

      closeWidget: (widgetId) => {
        const { localState, activeAudioWidget } = get();
        const widgetState = localState[widgetId];

        // If closing the active audio widget, clear it
        if (activeAudioWidget === widgetId) {
          set({ activeAudioWidget: null });
        }

        if (widgetState) {
          set({
            localState: {
              ...localState,
              [widgetId]: {
                ...widgetState,
                isVisible: false,
              },
            },
          });
        }
      },

      showWidget: (widgetId) => {
        const { localState } = get();
        const widgetState = localState[widgetId];
        if (widgetState) {
          set({
            localState: {
              ...localState,
              [widgetId]: {
                ...widgetState,
                isVisible: true,
              },
            },
          });
        }
      },

      minimizeWidget: (widgetId) => {
        const { localState } = get();
        const widgetState = localState[widgetId];
        if (widgetState) {
          set({
            localState: {
              ...localState,
              [widgetId]: {
                ...widgetState,
                state: 'minimized',
              },
            },
          });
        }
      },

      expandWidget: (widgetId) => {
        const { localState } = get();
        const widgetState = localState[widgetId];
        if (widgetState) {
          set({
            localState: {
              ...localState,
              [widgetId]: {
                ...widgetState,
                state: 'expanded',
              },
            },
          });
        }
      },

      updatePosition: (widgetId, position) => {
        const { localState } = get();
        const widgetState = localState[widgetId];
        if (widgetState) {
          set({
            localState: {
              ...localState,
              [widgetId]: {
                ...widgetState,
                position: {
                  ...widgetState.position,
                  ...position,
                },
              },
            },
          });
        }
      },

      snapToEdge: (widgetId, edge) => {
        const { localState } = get();
        const widgetState = localState[widgetId];
        if (widgetState) {
          set({
            localState: {
              ...localState,
              [widgetId]: {
                ...widgetState,
                isSnapped: edge !== null,
                snappedEdge: edge,
              },
            },
          });
        }
      },

      setActiveAudio: (widgetId) => {
        set({ activeAudioWidget: widgetId });
      },

      addWidget: (widget) => {
        const { widgets, localState } = get();
        set({
          widgets: [...widgets, widget],
          localState: {
            ...localState,
            [widget.id]: {
              isMuted: widget.is_muted,
              isVisible: widget.is_visible,
              position: widget.position,
              state: 'full',
              isSnapped: false,
              snappedEdge: null,
            },
          },
        });
      },

      removeWidget: (widgetId) => {
        const { widgets, localState, activeAudioWidget } = get();
        const { [widgetId]: removed, ...restState } = localState;

        // Clear active audio if removing that widget
        const newActiveAudio = activeAudioWidget === widgetId ? null : activeAudioWidget;

        set({
          widgets: widgets.filter((w) => w.id !== widgetId),
          localState: restState,
          activeAudioWidget: newActiveAudio,
        });
      },

      updateWidget: (widgetId, updates) => {
        const { widgets } = get();
        set({
          widgets: widgets.map((w) => (w.id === widgetId ? { ...w, ...updates } : w)),
        });
      },

      getWidgetState: (widgetId) => {
        const { localState, widgets } = get();
        const widget = widgets.find((w) => w.id === widgetId);
        const state = localState[widgetId];

        if (!widget) return null;

        return {
          isMuted: state?.isMuted ?? widget.is_muted,
          isVisible: state?.isVisible ?? widget.is_visible,
          position: state?.position ?? widget.position,
          state: state?.state ?? 'full',
          isSnapped: state?.isSnapped ?? false,
          snappedEdge: state?.snappedEdge ?? null,
        };
      },

      getVisibleWidgets: () => {
        const { widgets, localState } = get();
        return widgets.filter((widget) => {
          const state = localState[widget.id];
          const isVisible = state?.isVisible ?? widget.is_visible;
          return widget.is_active && isVisible;
        });
      },
    }),
    {
      name: 'bayit-pip-widget-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist local state, not the widgets array (that comes from API)
      partialize: (state) => ({
        localState: state.localState,
        activeAudioWidget: state.activeAudioWidget,
      }),
    }
  )
);

// Helper hook to get a single widget with its merged state
export function usePiPWidget(widgetId: string) {
  const widget = usePiPWidgetStore((state) =>
    state.widgets.find((w) => w.id === widgetId)
  );
  const widgetState = usePiPWidgetStore((state) => state.getWidgetState(widgetId));
  const toggleMute = usePiPWidgetStore((state) => state.toggleMute);
  const closeWidget = usePiPWidgetStore((state) => state.closeWidget);
  const minimizeWidget = usePiPWidgetStore((state) => state.minimizeWidget);
  const expandWidget = usePiPWidgetStore((state) => state.expandWidget);
  const updatePosition = usePiPWidgetStore((state) => state.updatePosition);
  const snapToEdge = usePiPWidgetStore((state) => state.snapToEdge);

  if (!widget || !widgetState) return null;

  return {
    widget,
    ...widgetState,
    toggleMute: () => toggleMute(widgetId),
    close: () => closeWidget(widgetId),
    minimize: () => minimizeWidget(widgetId),
    expand: () => expandWidget(widgetId),
    updatePosition: (pos: Partial<WidgetPosition>) => updatePosition(widgetId, pos),
    snapToEdge: (edge: SnappedEdge) => snapToEdge(widgetId, edge),
  };
}

export default usePiPWidgetStore;
