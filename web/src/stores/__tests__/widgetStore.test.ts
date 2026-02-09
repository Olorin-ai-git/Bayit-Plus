/**
 * Test suite for widgetStore (Zustand)
 * Tests widget CRUD, local state management, dock visibility,
 * voice widgets, and selector methods.
 */

import { useWidgetStore, VoiceContentItem } from '../widgetStore';
import type { Widget, WidgetPosition } from '@/types/widget';

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

function makeWidget(overrides: Partial<Widget> = {}): Widget {
  return {
    id: 'w1',
    type: 'personal',
    title: 'Test Widget',
    description: 'A test widget',
    icon: 'live_channel',
    cover_url: null,
    content: {
      content_type: 'live_channel',
      live_channel_id: 'ch-1',
      podcast_id: null,
      content_id: null,
      station_id: null,
    },
    position: { x: 20, y: 100, width: 630, height: 230, z_index: 100 },
    is_active: true,
    is_muted: true,
    is_visible: true,
    is_minimized: false,
    is_closable: true,
    is_draggable: true,
    visible_to_roles: ['user'],
    visible_to_subscription_tiers: [],
    target_pages: [],
    order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function resetStore() {
  useWidgetStore.setState({
    widgets: [],
    isLoading: false,
    error: null,
    localState: {},
    voiceWidgetIds: [],
    isDockVisible: true,
  });
}

describe('widgetStore', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  // MARK: - Initial State

  describe('initial state', () => {
    it('starts with empty widgets', () => {
      expect(useWidgetStore.getState().widgets).toEqual([]);
    });

    it('starts not loading', () => {
      expect(useWidgetStore.getState().isLoading).toBe(false);
    });

    it('starts with no error', () => {
      expect(useWidgetStore.getState().error).toBeNull();
    });

    it('starts with empty local state', () => {
      expect(useWidgetStore.getState().localState).toEqual({});
    });

    it('starts with no voice widget ids', () => {
      expect(useWidgetStore.getState().voiceWidgetIds).toEqual([]);
    });

    it('starts with dock visible', () => {
      expect(useWidgetStore.getState().isDockVisible).toBe(true);
    });
  });

  // MARK: - setWidgets

  describe('setWidgets', () => {
    it('sets widgets and initializes local state', () => {
      const widget = makeWidget();
      useWidgetStore.getState().setWidgets([widget]);

      expect(useWidgetStore.getState().widgets).toHaveLength(1);
      expect(useWidgetStore.getState().localState['w1']).toEqual({
        isMuted: true,
        isVisible: true,
        isMinimized: false,
        position: widget.position,
      });
    });

    it('preserves existing local state for known widgets', () => {
      const widget = makeWidget();
      useWidgetStore.setState({
        localState: {
          w1: {
            isMuted: false,
            isVisible: true,
            isMinimized: false,
            position: { x: 50, y: 200, width: 400, height: 300, z_index: 200 },
          },
        },
      });

      useWidgetStore.getState().setWidgets([widget]);

      // Should keep existing local state, not reinitialize
      expect(useWidgetStore.getState().localState['w1'].isMuted).toBe(false);
      expect(useWidgetStore.getState().localState['w1'].position.x).toBe(50);
    });

    it('preserves cover_url from existing widgets', () => {
      const existingWidget = makeWidget({ cover_url: 'https://img.example.com/cover.jpg' });
      useWidgetStore.setState({ widgets: [existingWidget] });

      const newWidget = makeWidget({ cover_url: null });
      useWidgetStore.getState().setWidgets([newWidget]);

      expect(useWidgetStore.getState().widgets[0].cover_url).toBe('https://img.example.com/cover.jpg');
    });

    it('clears error when setting widgets', () => {
      useWidgetStore.setState({ error: 'Previous error' });
      useWidgetStore.getState().setWidgets([]);

      expect(useWidgetStore.getState().error).toBeNull();
    });
  });

  // MARK: - setLoading / setError

  describe('setLoading', () => {
    it('sets loading state', () => {
      useWidgetStore.getState().setLoading(true);
      expect(useWidgetStore.getState().isLoading).toBe(true);

      useWidgetStore.getState().setLoading(false);
      expect(useWidgetStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error message', () => {
      useWidgetStore.getState().setError('Something went wrong');
      expect(useWidgetStore.getState().error).toBe('Something went wrong');
    });

    it('clears error with null', () => {
      useWidgetStore.setState({ error: 'Old error' });
      useWidgetStore.getState().setError(null);
      expect(useWidgetStore.getState().error).toBeNull();
    });
  });

  // MARK: - Widget State Toggles

  describe('toggleMute', () => {
    it('toggles mute state for widget', () => {
      const widget = makeWidget({ is_muted: true });
      useWidgetStore.getState().setWidgets([widget]);

      useWidgetStore.getState().toggleMute('w1');
      expect(useWidgetStore.getState().localState['w1'].isMuted).toBe(false);

      useWidgetStore.getState().toggleMute('w1');
      expect(useWidgetStore.getState().localState['w1'].isMuted).toBe(true);
    });

    it('does nothing for unknown widget id', () => {
      useWidgetStore.getState().toggleMute('nonexistent');
      expect(useWidgetStore.getState().localState).toEqual({});
    });
  });

  describe('closeWidget', () => {
    it('sets widget visibility to false', () => {
      const widget = makeWidget({ is_visible: true });
      useWidgetStore.getState().setWidgets([widget]);

      useWidgetStore.getState().closeWidget('w1');
      expect(useWidgetStore.getState().localState['w1'].isVisible).toBe(false);
    });

    it('does nothing for unknown widget id', () => {
      useWidgetStore.getState().closeWidget('nonexistent');
      expect(useWidgetStore.getState().localState).toEqual({});
    });
  });

  describe('showWidget', () => {
    it('sets widget visibility to true', () => {
      const widget = makeWidget({ is_visible: false });
      useWidgetStore.getState().setWidgets([widget]);
      // closeWidget first to set isVisible to false in localState
      useWidgetStore.getState().closeWidget('w1');

      useWidgetStore.getState().showWidget('w1');
      expect(useWidgetStore.getState().localState['w1'].isVisible).toBe(true);
    });
  });

  // MARK: - updatePosition

  describe('updatePosition', () => {
    it('updates widget position', () => {
      const widget = makeWidget();
      useWidgetStore.getState().setWidgets([widget]);

      useWidgetStore.getState().updatePosition('w1', { x: 100, y: 200 });

      const position = useWidgetStore.getState().localState['w1'].position;
      expect(position.x).toBe(100);
      expect(position.y).toBe(200);
      // Original width/height preserved
      expect(position.width).toBe(630);
      expect(position.height).toBe(230);
    });

    it('updates position dimensions', () => {
      const widget = makeWidget();
      useWidgetStore.getState().setWidgets([widget]);

      useWidgetStore.getState().updatePosition('w1', { width: 800, height: 400 });

      const position = useWidgetStore.getState().localState['w1'].position;
      expect(position.width).toBe(800);
      expect(position.height).toBe(400);
    });

    it('does nothing for unknown widget id', () => {
      useWidgetStore.getState().updatePosition('nonexistent', { x: 10 });
      expect(useWidgetStore.getState().localState).toEqual({});
    });
  });

  // MARK: - CRUD Operations

  describe('addWidget', () => {
    it('adds widget and initializes local state', () => {
      const widget = makeWidget();
      useWidgetStore.getState().addWidget(widget);

      expect(useWidgetStore.getState().widgets).toHaveLength(1);
      expect(useWidgetStore.getState().localState['w1']).toBeDefined();
      expect(useWidgetStore.getState().localState['w1'].isMuted).toBe(true);
    });

    it('appends to existing widgets', () => {
      const widget1 = makeWidget({ id: 'w1' });
      const widget2 = makeWidget({ id: 'w2', title: 'Second Widget' });

      useWidgetStore.getState().addWidget(widget1);
      useWidgetStore.getState().addWidget(widget2);

      expect(useWidgetStore.getState().widgets).toHaveLength(2);
    });
  });

  describe('removeWidget', () => {
    it('removes widget and its local state', () => {
      const widget1 = makeWidget({ id: 'w1' });
      const widget2 = makeWidget({ id: 'w2' });
      useWidgetStore.getState().addWidget(widget1);
      useWidgetStore.getState().addWidget(widget2);

      useWidgetStore.getState().removeWidget('w1');

      expect(useWidgetStore.getState().widgets).toHaveLength(1);
      expect(useWidgetStore.getState().widgets[0].id).toBe('w2');
      expect(useWidgetStore.getState().localState['w1']).toBeUndefined();
      expect(useWidgetStore.getState().localState['w2']).toBeDefined();
    });
  });

  describe('updateWidget', () => {
    it('updates widget properties', () => {
      const widget = makeWidget();
      useWidgetStore.getState().addWidget(widget);

      useWidgetStore.getState().updateWidget('w1', { title: 'Updated Title' });

      expect(useWidgetStore.getState().widgets[0].title).toBe('Updated Title');
    });

    it('does not modify other widgets', () => {
      const widget1 = makeWidget({ id: 'w1', title: 'First' });
      const widget2 = makeWidget({ id: 'w2', title: 'Second' });
      useWidgetStore.getState().addWidget(widget1);
      useWidgetStore.getState().addWidget(widget2);

      useWidgetStore.getState().updateWidget('w1', { title: 'Updated' });

      expect(useWidgetStore.getState().widgets[1].title).toBe('Second');
    });
  });

  // MARK: - Dock Visibility

  describe('dock visibility', () => {
    it('toggles dock visible', () => {
      expect(useWidgetStore.getState().isDockVisible).toBe(true);

      useWidgetStore.getState().toggleDockVisible();
      expect(useWidgetStore.getState().isDockVisible).toBe(false);

      useWidgetStore.getState().toggleDockVisible();
      expect(useWidgetStore.getState().isDockVisible).toBe(true);
    });

    it('sets dock visible explicitly', () => {
      useWidgetStore.getState().setDockVisible(false);
      expect(useWidgetStore.getState().isDockVisible).toBe(false);

      useWidgetStore.getState().setDockVisible(true);
      expect(useWidgetStore.getState().isDockVisible).toBe(true);
    });
  });

  // MARK: - Voice Widgets

  describe('voice widgets', () => {
    const voiceItems: VoiceContentItem[] = [
      {
        id: 'ch-1',
        name: 'Channel 12',
        type: 'channel',
        thumbnail: 'https://img.example.com/ch12.jpg',
      },
      {
        id: 'movie-1',
        name: 'Test Movie',
        type: 'movie',
        thumbnail: 'https://img.example.com/movie.jpg',
      },
    ];

    it('creates voice widgets from content items', () => {
      useWidgetStore.getState().createVoiceWidgets(voiceItems);

      const state = useWidgetStore.getState();
      expect(state.widgets).toHaveLength(2);
      expect(state.voiceWidgetIds).toHaveLength(2);
    });

    it('first voice widget is unmuted, rest are muted', () => {
      useWidgetStore.getState().createVoiceWidgets(voiceItems);

      const state = useWidgetStore.getState();
      const firstWidgetId = state.voiceWidgetIds[0];
      const secondWidgetId = state.voiceWidgetIds[1];

      expect(state.localState[firstWidgetId].isMuted).toBe(false);
      expect(state.localState[secondWidgetId].isMuted).toBe(true);
    });

    it('voice widgets are all visible', () => {
      useWidgetStore.getState().createVoiceWidgets(voiceItems);

      const state = useWidgetStore.getState();
      state.voiceWidgetIds.forEach((id) => {
        expect(state.localState[id].isVisible).toBe(true);
      });
    });

    it('clears existing voice widgets before creating new ones', () => {
      useWidgetStore.getState().createVoiceWidgets(voiceItems);
      const firstBatchCount = useWidgetStore.getState().voiceWidgetIds.length;
      expect(firstBatchCount).toBe(2);

      // Advance time to ensure unique IDs
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + 1000);

      try {
        const newItems: VoiceContentItem[] = [
          { id: 'ch-2', name: 'Channel 14', type: 'channel' },
        ];
        useWidgetStore.getState().createVoiceWidgets(newItems);

        const state = useWidgetStore.getState();
        // Only the new batch should remain as voice widgets
        expect(state.voiceWidgetIds).toHaveLength(1);
        // Total widgets should be 1 (the new voice widget, old ones cleared)
        expect(state.widgets).toHaveLength(1);
        expect(state.widgets[0].title).toBe('Channel 14');
      } finally {
        Date.now = originalDateNow;
      }
    });

    it('does nothing for empty items array', () => {
      useWidgetStore.getState().createVoiceWidgets([]);

      expect(useWidgetStore.getState().widgets).toHaveLength(0);
      expect(useWidgetStore.getState().voiceWidgetIds).toHaveLength(0);
    });

    it('preserves non-voice widgets when creating voice widgets', () => {
      const regularWidget = makeWidget({ id: 'regular-1' });
      useWidgetStore.getState().addWidget(regularWidget);

      useWidgetStore.getState().createVoiceWidgets(voiceItems);

      expect(useWidgetStore.getState().widgets.length).toBeGreaterThan(2);
      expect(useWidgetStore.getState().widgets.find((w) => w.id === 'regular-1')).toBeDefined();
    });

    it('clearVoiceWidgets removes only voice widgets', () => {
      const regularWidget = makeWidget({ id: 'regular-1' });
      useWidgetStore.getState().addWidget(regularWidget);
      useWidgetStore.getState().createVoiceWidgets(voiceItems);

      useWidgetStore.getState().clearVoiceWidgets();

      expect(useWidgetStore.getState().widgets).toHaveLength(1);
      expect(useWidgetStore.getState().widgets[0].id).toBe('regular-1');
      expect(useWidgetStore.getState().voiceWidgetIds).toEqual([]);
    });

    it('clearVoiceWidgets does nothing when no voice widgets exist', () => {
      const regularWidget = makeWidget({ id: 'regular-1' });
      useWidgetStore.getState().addWidget(regularWidget);

      useWidgetStore.getState().clearVoiceWidgets();

      expect(useWidgetStore.getState().widgets).toHaveLength(1);
    });

    it('hasVoiceWidgets returns correct status', () => {
      expect(useWidgetStore.getState().hasVoiceWidgets()).toBe(false);

      useWidgetStore.getState().createVoiceWidgets(voiceItems);
      expect(useWidgetStore.getState().hasVoiceWidgets()).toBe(true);

      useWidgetStore.getState().clearVoiceWidgets();
      expect(useWidgetStore.getState().hasVoiceWidgets()).toBe(false);
    });

    it('maps channel type to live_channel content type', () => {
      useWidgetStore.getState().createVoiceWidgets([
        { id: 'ch-1', name: 'Channel', type: 'channel' },
      ]);

      const widget = useWidgetStore.getState().widgets[0];
      expect(widget.content.content_type).toBe('live_channel');
      expect(widget.content.live_channel_id).toBe('ch-1');
    });

    it('maps movie type to vod content type', () => {
      useWidgetStore.getState().createVoiceWidgets([
        { id: 'm-1', name: 'Movie', type: 'movie' },
      ]);

      const widget = useWidgetStore.getState().widgets[0];
      expect(widget.content.content_type).toBe('vod');
      expect(widget.content.content_id).toBe('m-1');
    });

    it('maps radio type to radio content type', () => {
      useWidgetStore.getState().createVoiceWidgets([
        { id: 'r-1', name: 'Radio Station', type: 'radio' },
      ]);

      const widget = useWidgetStore.getState().widgets[0];
      expect(widget.content.content_type).toBe('radio');
      expect(widget.content.station_id).toBe('r-1');
    });

    it('maps podcast type to podcast content type', () => {
      useWidgetStore.getState().createVoiceWidgets([
        { id: 'p-1', name: 'Podcast', type: 'podcast' },
      ]);

      const widget = useWidgetStore.getState().widgets[0];
      expect(widget.content.content_type).toBe('podcast');
      expect(widget.content.podcast_id).toBe('p-1');
    });
  });

  // MARK: - Selectors

  describe('getWidgetState', () => {
    it('returns merged state for known widget', () => {
      const widget = makeWidget({ is_muted: true, is_visible: true, is_minimized: false });
      useWidgetStore.getState().addWidget(widget);

      const widgetState = useWidgetStore.getState().getWidgetState('w1');

      expect(widgetState).not.toBeNull();
      expect(widgetState!.isMuted).toBe(true);
      expect(widgetState!.isVisible).toBe(true);
      expect(widgetState!.isMinimized).toBe(false);
    });

    it('returns null for unknown widget', () => {
      expect(useWidgetStore.getState().getWidgetState('nonexistent')).toBeNull();
    });

    it('uses local state over backend state', () => {
      const widget = makeWidget({ is_muted: true });
      useWidgetStore.getState().addWidget(widget);
      // Toggle mute in local state
      useWidgetStore.getState().toggleMute('w1');

      const widgetState = useWidgetStore.getState().getWidgetState('w1');
      expect(widgetState!.isMuted).toBe(false);
    });
  });

  describe('getVisibleWidgets', () => {
    it('returns only active and visible widgets', () => {
      const visible = makeWidget({ id: 'w1', is_active: true, is_visible: true });
      const hidden = makeWidget({ id: 'w2', is_active: true, is_visible: false });
      const inactive = makeWidget({ id: 'w3', is_active: false, is_visible: true });

      useWidgetStore.getState().addWidget(visible);
      useWidgetStore.getState().addWidget(hidden);
      useWidgetStore.getState().addWidget(inactive);

      const visibleWidgets = useWidgetStore.getState().getVisibleWidgets();
      expect(visibleWidgets).toHaveLength(1);
      expect(visibleWidgets[0].id).toBe('w1');
    });

    it('respects local state visibility over backend', () => {
      const widget = makeWidget({ id: 'w1', is_active: true, is_visible: true });
      useWidgetStore.getState().addWidget(widget);
      useWidgetStore.getState().closeWidget('w1');

      const visibleWidgets = useWidgetStore.getState().getVisibleWidgets();
      expect(visibleWidgets).toHaveLength(0);
    });

    it('returns empty array when no widgets', () => {
      expect(useWidgetStore.getState().getVisibleWidgets()).toEqual([]);
    });
  });
});
