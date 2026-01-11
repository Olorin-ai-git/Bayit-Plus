/**
 * Widget Store - Global state for widgets (floating overlays)
 *
 * Manages:
 * - Active widgets from backend
 * - Per-widget client state (muted, visible, position)
 * - Local persistence for widget preferences
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Widget,
  WidgetPosition,
  WidgetClientState,
  WidgetCreateRequest,
  WidgetUpdateRequest,
} from '@/types/widget';

// Per-widget state that persists locally
interface WidgetLocalState {
  [widgetId: string]: {
    isMuted: boolean;
    isVisible: boolean;
    position?: WidgetPosition;
  };
}

interface WidgetState {
  // Widgets loaded from backend
  widgets: Widget[];
  isLoading: boolean;
  error: string | null;

  // Local state per widget (persisted)
  localState: WidgetLocalState;

  // Actions - Data fetching
  setWidgets: (widgets: Widget[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Widget state
  toggleMute: (widgetId: string) => void;
  closeWidget: (widgetId: string) => void;
  showWidget: (widgetId: string) => void;
  updatePosition: (widgetId: string, position: Partial<WidgetPosition>) => void;

  // Actions - CRUD (calls API then updates local)
  addWidget: (widget: Widget) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<Widget>) => void;

  // Selectors
  getWidgetState: (widgetId: string) => WidgetClientState | null;
  getVisibleWidgets: () => Widget[];
}

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set, get) => ({
      widgets: [],
      isLoading: false,
      error: null,
      localState: {},

      setWidgets: (newWidgets) => {
        // Initialize local state for new widgets
        const currentState = get().localState;
        const currentWidgets = get().widgets;
        const newLocalState = { ...currentState };

        // Preserve cover_url from existing widgets (fetched client-side)
        const widgetsWithPreservedData = newWidgets.map((widget) => {
          const existing = currentWidgets.find((w) => w.id === widget.id);
          if (existing?.cover_url && !widget.cover_url) {
            return { ...widget, cover_url: existing.cover_url };
          }
          return widget;
        });

        widgetsWithPreservedData.forEach((widget) => {
          if (!newLocalState[widget.id]) {
            // Initialize with backend defaults
            newLocalState[widget.id] = {
              isMuted: widget.is_muted,
              isVisible: widget.is_visible,
              position: widget.position,
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
        const { localState } = get();
        const widgetState = localState[widgetId];
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
                  ...(widgetState.position || { x: 20, y: 100, width: 350, height: 197, z_index: 100 }),
                  ...position,
                },
              },
            },
          });
        }
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
            },
          },
        });
      },

      removeWidget: (widgetId) => {
        const { widgets, localState } = get();
        const { [widgetId]: removed, ...restState } = localState;
        set({
          widgets: widgets.filter((w) => w.id !== widgetId),
          localState: restState,
        });
      },

      updateWidget: (widgetId, updates) => {
        const { widgets } = get();
        set({
          widgets: widgets.map((w) =>
            w.id === widgetId ? { ...w, ...updates } : w
          ),
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
        };
      },

      getVisibleWidgets: () => {
        const { widgets, localState } = get();
        return widgets.filter((widget) => {
          const state = localState[widget.id];
          // Use local state if available, otherwise backend state
          const isVisible = state?.isVisible ?? widget.is_visible;
          return widget.is_active && isVisible;
        });
      },
    }),
    {
      name: 'bayit-widget-store',
      // Only persist local state, not the widgets array (that comes from API)
      partialize: (state) => ({ localState: state.localState }),
    }
  )
);

// Helper hook to get a single widget with its merged state
export function useWidget(widgetId: string) {
  const widget = useWidgetStore((state) =>
    state.widgets.find((w) => w.id === widgetId)
  );
  const widgetState = useWidgetStore((state) => state.getWidgetState(widgetId));
  const toggleMute = useWidgetStore((state) => state.toggleMute);
  const closeWidget = useWidgetStore((state) => state.closeWidget);
  const updatePosition = useWidgetStore((state) => state.updatePosition);

  if (!widget || !widgetState) return null;

  return {
    widget,
    ...widgetState,
    toggleMute: () => toggleMute(widgetId),
    close: () => closeWidget(widgetId),
    updatePosition: (pos: Partial<WidgetPosition>) => updatePosition(widgetId, pos),
  };
}
