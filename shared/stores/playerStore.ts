/**
 * Player Store - Manages video player state across platforms.
 *
 * Tracks playback state, settings, and provides player controls.
 * Platform-specific player implementations read from this store.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PlayerState,
  PlayerSettings,
  QualityTier,
  AudioTrack,
  StreamManifest,
} from '../types/vod';
import logger from '../utils/logger';

const playerLogger = logger.scope('PlayerStore');

interface PlayerStoreState extends PlayerState {
  // Content info
  contentId: string | null;
  contentTitle: string | null;
  manifest: StreamManifest | null;

  // Settings (persisted per-platform)
  settings: PlayerSettings;

  // Episode navigation
  hasNextEpisode: boolean;
  hasPreviousEpisode: boolean;

  // Actions - Playback
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  skipForward: (seconds?: number) => void;
  skipBack: (seconds?: number) => void;
  setPlaybackRate: (rate: number) => void;

  // Actions - State updates (called by platform player)
  updateTime: (currentTime: number) => void;
  updateDuration: (duration: number) => void;
  updateBuffered: (buffered: number) => void;
  setBuffering: (isBuffering: boolean) => void;
  setControlsVisible: (visible: boolean) => void;

  // Actions - Quality/Audio/Subtitles
  setQuality: (quality: QualityTier | 'auto') => void;
  setAudioTrack: (track: AudioTrack | null) => void;
  setSubtitleLanguage: (language: string | null) => void;
  setAvailableQualities: (qualities: QualityTier[]) => void;
  setAvailableAudioTracks: (tracks: AudioTrack[]) => void;

  // Actions - Volume
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  // Actions - Fullscreen/PiP
  setFullscreen: (isFullscreen: boolean) => void;
  setPiP: (isPiP: boolean) => void;

  // Actions - Content
  loadContent: (params: {
    contentId: string;
    title: string;
    manifest?: StreamManifest;
    hasNext?: boolean;
    hasPrevious?: boolean;
  }) => void;
  resetPlayer: () => void;

  // Actions - Settings
  updateSettings: (settings: Partial<PlayerSettings>) => void;

  // Actions - Episode navigation
  setEpisodeNavigation: (hasNext: boolean, hasPrevious: boolean) => void;
}

const DEFAULT_SETTINGS: PlayerSettings = {
  preferredQuality: 'auto',
  preferredSubtitleLanguage: 'he',
  preferredAudioLanguage: 'he',
  autoPlayNext: true,
  skipIntro: false,
  skipCredits: false,
};

const INITIAL_PLAYER_STATE: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  isBuffering: false,
  playbackRate: 1,
  volume: 1,
  isMuted: false,
  isFullscreen: false,
  isPiP: false,
  selectedQuality: 'auto',
  selectedAudioTrack: null,
  selectedSubtitleLanguage: null,
  availableQualities: [],
  availableAudioTracks: [],
  controlsVisible: true,
};

const SKIP_FORWARD_SECONDS = 30;
const SKIP_BACK_SECONDS = 10;

export const usePlayerStore = create<PlayerStoreState>()(
  persist(
    (set, get) => ({
  ...INITIAL_PLAYER_STATE,
  contentId: null,
  contentTitle: null,
  manifest: null,
  settings: DEFAULT_SETTINGS,
  hasNextEpisode: false,
  hasPreviousEpisode: false,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),

  seek: (time: number) => {
    const { duration } = get();
    const clampedTime = Math.max(0, Math.min(time, duration));
    set({ currentTime: clampedTime });
  },

  skipForward: (seconds = SKIP_FORWARD_SECONDS) => {
    const { currentTime, duration } = get();
    set({ currentTime: Math.min(currentTime + seconds, duration) });
  },

  skipBack: (seconds = SKIP_BACK_SECONDS) => {
    const { currentTime } = get();
    set({ currentTime: Math.max(currentTime - seconds, 0) });
  },

  setPlaybackRate: (rate: number) => set({ playbackRate: rate }),

  updateTime: (currentTime: number) => set({ currentTime }),
  updateDuration: (duration: number) => set({ duration }),
  updateBuffered: (buffered: number) => set({ buffered }),
  setBuffering: (isBuffering: boolean) => set({ isBuffering }),
  setControlsVisible: (visible: boolean) => set({ controlsVisible: visible }),

  setQuality: (quality: QualityTier | 'auto') => set({ selectedQuality: quality }),
  setAudioTrack: (track: AudioTrack | null) => set({ selectedAudioTrack: track }),
  setSubtitleLanguage: (language: string | null) => set({ selectedSubtitleLanguage: language }),
  setAvailableQualities: (qualities: QualityTier[]) => set({ availableQualities: qualities }),
  setAvailableAudioTracks: (tracks: AudioTrack[]) => set({ availableAudioTracks: tracks }),

  setVolume: (volume: number) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  setFullscreen: (isFullscreen: boolean) => set({ isFullscreen }),
  setPiP: (isPiP: boolean) => set({ isPiP }),

  loadContent: ({ contentId, title, manifest, hasNext = false, hasPrevious = false }) => {
    playerLogger.info('Loading content into player', { contentId, title });
    const { settings } = get();
    set({
      ...INITIAL_PLAYER_STATE,
      contentId,
      contentTitle: title,
      manifest: manifest || null,
      hasNextEpisode: hasNext,
      hasPreviousEpisode: hasPrevious,
      selectedQuality: settings.preferredQuality,
      selectedSubtitleLanguage: settings.preferredSubtitleLanguage,
    });
  },

  resetPlayer: () => {
    set({
      ...INITIAL_PLAYER_STATE,
      contentId: null,
      contentTitle: null,
      manifest: null,
      hasNextEpisode: false,
      hasPreviousEpisode: false,
    });
  },

  updateSettings: (newSettings: Partial<PlayerSettings>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  setEpisodeNavigation: (hasNext: boolean, hasPrevious: boolean) => {
    set({ hasNextEpisode: hasNext, hasPreviousEpisode: hasPrevious });
  },
}),
    {
      name: 'bayit-player-settings',
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
);

export default usePlayerStore;
