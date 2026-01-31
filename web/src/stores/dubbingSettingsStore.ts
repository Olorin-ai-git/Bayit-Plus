/**
 * Dubbing Settings Store
 * Persistent per-channel dubbing settings using Zustand + localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Per-channel dubbing settings
 */
export interface ChannelDubbingSettings {
  /** Audio buffer size in samples (1024, 2048, or 4096) */
  bufferSize: 1024 | 2048 | 4096;

  /** Sync delay in milliseconds (-500 to +500) */
  syncDelayMs: number;

  /** Enable automatic adaptive sync delay based on latency */
  autoAdaptiveSync: boolean;

  /** Selected ElevenLabs voice ID (null = use default) */
  voiceId: string | null;

  /** Original audio volume (0.0 - 1.0) */
  originalVolume: number;

  /** Dubbed audio volume (0.0 - 1.0) */
  dubbedVolume: number;
}

/**
 * Default settings for a new channel
 */
const DEFAULT_CHANNEL_SETTINGS: ChannelDubbingSettings = {
  bufferSize: 2048, // Default to balanced quality/latency
  syncDelayMs: 250, // Adaptive baseline (reduced from 600ms)
  autoAdaptiveSync: true, // Enable adaptive sync by default
  voiceId: null, // Use service default
  originalVolume: 0.3, // Lower original for better dubbing clarity
  dubbedVolume: 1.0, // Full volume for dubbed track
};

/**
 * Store state
 */
interface DubbingSettingsState {
  /** Per-channel settings map (channelId -> settings) */
  settings: Record<string, ChannelDubbingSettings>;

  /** Get settings for a specific channel (returns default if not set) */
  getChannelSettings: (channelId: string) => ChannelDubbingSettings;

  /** Update settings for a specific channel (partial update) */
  updateChannelSettings: (
    channelId: string,
    updates: Partial<ChannelDubbingSettings>
  ) => void;

  /** Reset settings for a specific channel to defaults */
  resetChannelSettings: (channelId: string) => void;

  /** Reset all settings to defaults */
  resetAllSettings: () => void;

  /** Get all channel IDs with custom settings */
  getConfiguredChannels: () => string[];
}

/**
 * Dubbing settings store with localStorage persistence
 */
export const useDubbingSettingsStore = create<DubbingSettingsState>()(
  persist(
    (set, get) => ({
      settings: {},

      getChannelSettings: (channelId: string) => {
        const { settings } = get();
        return settings[channelId] || DEFAULT_CHANNEL_SETTINGS;
      },

      updateChannelSettings: (
        channelId: string,
        updates: Partial<ChannelDubbingSettings>
      ) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [channelId]: {
              ...(state.settings[channelId] || DEFAULT_CHANNEL_SETTINGS),
              ...updates,
            },
          },
        }));
      },

      resetChannelSettings: (channelId: string) => {
        set((state) => {
          const newSettings = { ...state.settings };
          delete newSettings[channelId];
          return { settings: newSettings };
        });
      },

      resetAllSettings: () => {
        set({ settings: {} });
      },

      getConfiguredChannels: () => {
        const { settings } = get();
        return Object.keys(settings);
      },
    }),
    {
      name: 'bayit-dubbing-settings', // localStorage key
      version: 1, // Schema version for future migrations
    }
  )
);

/**
 * Hook to get and update settings for a specific channel
 */
export const useChannelDubbingSettings = (channelId: string) => {
  const settings = useDubbingSettingsStore((state) =>
    state.getChannelSettings(channelId)
  );
  const updateSettings = useDubbingSettingsStore(
    (state) => state.updateChannelSettings
  );
  const resetSettings = useDubbingSettingsStore(
    (state) => state.resetChannelSettings
  );

  return {
    settings,
    updateSettings: (updates: Partial<ChannelDubbingSettings>) =>
      updateSettings(channelId, updates),
    resetSettings: () => resetSettings(channelId),
  };
};

/**
 * Latency history tracking (60-second rolling window)
 */
export interface LatencyDataPoint {
  timestamp: number; // Unix timestamp (ms)
  totalMs: number; // Total latency
  sttMs: number; // Speech-to-text
  translationMs: number; // Translation
  ttsMs: number; // Text-to-speech
  networkMs: number; // Network roundtrip
  bufferMs: number; // Audio buffer
  syncMs: number; // Sync delay
}

interface LatencyHistoryState {
  /** Per-channel latency history (channelId -> data points) */
  history: Record<string, LatencyDataPoint[]>;

  /** Add a latency data point for a channel */
  addDataPoint: (channelId: string, dataPoint: LatencyDataPoint) => void;

  /** Get latency history for a channel (last 60 seconds) */
  getHistory: (channelId: string) => LatencyDataPoint[];

  /** Clear history for a channel */
  clearHistory: (channelId: string) => void;

  /** Calculate average latency for a channel */
  getAverageLatency: (channelId: string) => LatencyDataPoint | null;
}

/**
 * Latency history store (in-memory only, not persisted)
 */
export const useLatencyHistoryStore = create<LatencyHistoryState>((set, get) => ({
  history: {},

  addDataPoint: (channelId: string, dataPoint: LatencyDataPoint) => {
    set((state) => {
      const channelHistory = state.history[channelId] || [];
      const now = Date.now();
      const cutoffTime = now - 60000; // 60 seconds ago

      // Add new point and filter out old points (>60 seconds)
      const updatedHistory = [...channelHistory, dataPoint].filter(
        (point) => point.timestamp > cutoffTime
      );

      return {
        history: {
          ...state.history,
          [channelId]: updatedHistory,
        },
      };
    });
  },

  getHistory: (channelId: string) => {
    const { history } = get();
    return history[channelId] || [];
  },

  clearHistory: (channelId: string) => {
    set((state) => {
      const newHistory = { ...state.history };
      delete newHistory[channelId];
      return { history: newHistory };
    });
  },

  getAverageLatency: (channelId: string) => {
    const { history } = get();
    const channelHistory = history[channelId];

    if (!channelHistory || channelHistory.length === 0) {
      return null;
    }

    // Calculate averages
    const sum = channelHistory.reduce(
      (acc, point) => ({
        totalMs: acc.totalMs + point.totalMs,
        sttMs: acc.sttMs + point.sttMs,
        translationMs: acc.translationMs + point.translationMs,
        ttsMs: acc.ttsMs + point.ttsMs,
        networkMs: acc.networkMs + point.networkMs,
        bufferMs: acc.bufferMs + point.bufferMs,
        syncMs: acc.syncMs + point.syncMs,
      }),
      {
        totalMs: 0,
        sttMs: 0,
        translationMs: 0,
        ttsMs: 0,
        networkMs: 0,
        bufferMs: 0,
        syncMs: 0,
      }
    );

    const count = channelHistory.length;

    return {
      timestamp: Date.now(),
      totalMs: Math.round(sum.totalMs / count),
      sttMs: Math.round(sum.sttMs / count),
      translationMs: Math.round(sum.translationMs / count),
      ttsMs: Math.round(sum.ttsMs / count),
      networkMs: Math.round(sum.networkMs / count),
      bufferMs: Math.round(sum.bufferMs / count),
      syncMs: Math.round(sum.syncMs / count),
    };
  },
}));
