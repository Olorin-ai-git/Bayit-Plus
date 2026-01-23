/**
 * Widget Store - Global state for widgets (floating overlays)
 *
 * Manages:
 * - Active widgets from backend
 * - Per-widget client state (muted, visible, position)
 * - Local persistence for widget preferences
 * - Voice-created temporary widgets for multi-content display
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import logger from '@/utils/logger';
import type {
  Widget,
  WidgetPosition,
  WidgetClientState,
  WidgetCreateRequest,
  WidgetUpdateRequest,
  WidgetContentType,
} from '@/types/widget';

// Voice-created widget content item (from resolve-content API)
export interface VoiceContentItem {
  id: string;
  name: string;
  type: 'channel' | 'movie' | 'series' | 'podcast' | 'radio';
  thumbnail?: string;
  streamUrl?: string;
  matchedName?: string;
  confidence?: number;
}

// Prefix for voice-created widget IDs to identify them
const VOICE_WIDGET_PREFIX = 'voice-widget-';

// Calculate grid positions for multiple widgets
function calculateGridPositions(
  itemCount: number,
  screenWidth: number,
  screenHeight: number
): WidgetPosition[] {
  const positions: WidgetPosition[] = [];
  
  // Padding and spacing
  const padding = 20;
  const spacing = 10;
  const headerHeight = 80; // Account for header
  
  // Calculate available space
  const availableWidth = screenWidth - (padding * 2);
  const availableHeight = screenHeight - headerHeight - (padding * 2);
  
  // Determine grid layout based on item count
  let cols: number;
  let rows: number;
  
  if (itemCount <= 2) {
    cols = 2;
    rows = 1;
  } else if (itemCount <= 4) {
    cols = 2;
    rows = 2;
  } else {
    cols = 3;
    rows = 2;
  }
  
  // Calculate widget dimensions
  const widgetWidth = Math.floor((availableWidth - (spacing * (cols - 1))) / cols);
  const widgetHeight = Math.floor((availableHeight - (spacing * (rows - 1))) / rows);
  
  // Ensure reasonable minimum dimensions
  const minWidth = 300;
  const minHeight = 180;
  const finalWidth = Math.max(widgetWidth, minWidth);
  const finalHeight = Math.max(widgetHeight, minHeight);
  
  // Generate positions
  for (let i = 0; i < itemCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    positions.push({
      x: padding + (col * (finalWidth + spacing)),
      y: headerHeight + padding + (row * (finalHeight + spacing)),
      width: finalWidth,
      height: finalHeight,
      z_index: 1000 + i, // High z-index for voice widgets
    });
  }
  
  return positions;
}

// Map content type to widget content type
function mapContentType(type: string): WidgetContentType {
  switch (type) {
    case 'channel':
      return 'live_channel';
    case 'movie':
    case 'series':
      return 'vod';
    case 'podcast':
      return 'podcast';
    case 'radio':
      return 'radio';
    default:
      return 'live';
  }
}

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

  // Voice widget tracking
  voiceWidgetIds: string[];

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

  // Actions - Voice widgets (created from voice commands)
  createVoiceWidgets: (items: VoiceContentItem[]) => void;
  clearVoiceWidgets: () => void;
  hasVoiceWidgets: () => boolean;

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
      voiceWidgetIds: [],

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

      // Create temporary widgets from voice command content
      createVoiceWidgets: (items) => {
        // First, clear any existing voice widgets
        get().clearVoiceWidgets();

        if (items.length === 0) return;

        // Get screen dimensions
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

        // Calculate grid positions
        const positions = calculateGridPositions(items.length, screenWidth, screenHeight);

        // Create widgets
        const now = new Date().toISOString();
        const newWidgets: Widget[] = [];
        const newLocalState: WidgetLocalState = { ...get().localState };
        const newVoiceWidgetIds: string[] = [];

        items.forEach((item, index) => {
          const widgetId = `${VOICE_WIDGET_PREFIX}${Date.now()}-${index}`;
          const position = positions[index] || positions[0];
          
          // Determine content type and content ID fields
          const contentType = mapContentType(item.type);
          const content: Widget['content'] = {
            content_type: contentType,
            live_channel_id: item.type === 'channel' ? item.id : null,
            podcast_id: item.type === 'podcast' ? item.id : null,
            content_id: (item.type === 'movie' || item.type === 'series') ? item.id : null,
            station_id: item.type === 'radio' ? item.id : null,
          };

          const widget: Widget = {
            id: widgetId,
            type: 'personal',
            title: item.name,
            description: `Voice-created widget for ${item.name}`,
            icon: item.type === 'channel' ? '📺' : item.type === 'podcast' ? '🎙️' : item.type === 'radio' ? '📻' : '🎬',
            cover_url: item.thumbnail,
            content,
            position,
            is_active: true,
            is_muted: index > 0, // First widget unmuted, rest muted
            is_visible: true,
            is_closable: true,
            is_draggable: true,
            visible_to_roles: ['user'],
            visible_to_subscription_tiers: [],
            target_pages: [],
            order: index,
            created_at: now,
            updated_at: now,
          };

          newWidgets.push(widget);
          newVoiceWidgetIds.push(widgetId);

          // Initialize local state for the widget
          newLocalState[widgetId] = {
            isMuted: index > 0, // First widget unmuted
            isVisible: true,
            position,
          };
        });

        // Update store
        set({
          widgets: [...get().widgets, ...newWidgets],
          localState: newLocalState,
          voiceWidgetIds: newVoiceWidgetIds,
        });

        logger.debug(`Created ${newWidgets.length} voice widgets`, 'widgetStore');
      },

      // Clear all voice-created widgets
      clearVoiceWidgets: () => {
        const { widgets, localState, voiceWidgetIds } = get();
        
        if (voiceWidgetIds.length === 0) return;

        // Remove voice widgets from widgets array
        const filteredWidgets = widgets.filter((w) => !voiceWidgetIds.includes(w.id));
        
        // Remove voice widgets from local state
        const filteredLocalState = { ...localState };
        voiceWidgetIds.forEach((id) => {
          delete filteredLocalState[id];
        });

        set({
          widgets: filteredWidgets,
          localState: filteredLocalState,
          voiceWidgetIds: [],
        });

        logger.debug(`Cleared ${voiceWidgetIds.length} voice widgets`, 'widgetStore');
      },

      // Check if there are any voice widgets active
      hasVoiceWidgets: () => {
        return get().voiceWidgetIds.length > 0;
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
      // Only persist local state, not widgets array or voice widgets (transient)
      partialize: (state) => ({ 
        localState: Object.fromEntries(
          Object.entries(state.localState).filter(
            ([key]) => !key.startsWith(VOICE_WIDGET_PREFIX)
          )
        ),
      }),
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
