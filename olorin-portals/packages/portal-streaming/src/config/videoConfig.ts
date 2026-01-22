/**
 * Video Configuration System
 * Centralized configuration for all video assets, CDN URLs, and optimization settings
 */

import { detectPlatform } from '@olorin/shared';

export interface VideoSource {
  src: string;
  type: 'video/webm' | 'video/mp4';
}

export interface CaptionTrack {
  src: string;
  lang: string;
  label: string;
}

export interface VideoAsset {
  src: string | VideoSource[];
  posterSrc: string;
  captions?: CaptionTrack[];
}

export interface VideoConfig {
  hero: VideoAsset;
  aiAssistant: VideoAsset;
  voiceRequest: VideoAsset;
  voiceResponse: VideoAsset;
}

export interface VideoSettings {
  autoplay: boolean;
  showControls: boolean;
  preload: 'metadata';
  playsinline: boolean;
  muted: boolean;
  loop: boolean;
  controls: boolean;
  disablePictureInPicture: boolean;
  usePosterOnly?: boolean;
}

/**
 * Validate required environment variables
 * Fails fast with clear error message if configuration is missing
 */
const validateVideoConfig = () => {
  const required = [
    'REACT_APP_VIDEO_HERO_WEBM_URL',
    'REACT_APP_VIDEO_HERO_MP4_URL',
    'REACT_APP_VIDEO_HERO_POSTER',
    'REACT_APP_VIDEO_AI_WEBM_URL',
    'REACT_APP_VIDEO_AI_MP4_URL',
    'REACT_APP_VIDEO_AI_POSTER',
    'REACT_APP_VIDEO_VOICE_REQUEST_WEBM_URL',
    'REACT_APP_VIDEO_VOICE_REQUEST_MP4_URL',
    'REACT_APP_VIDEO_VOICE_REQUEST_POSTER',
    'REACT_APP_VIDEO_VOICE_RESPONSE_WEBM_URL',
    'REACT_APP_VIDEO_VOICE_RESPONSE_MP4_URL',
    'REACT_APP_VIDEO_VOICE_RESPONSE_POSTER',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required video configuration. Please set the following environment variables:\n${missing.join('\n')}\n\nSee .env.example for required configuration.`
    );
  }
};

// Validate configuration at module load time
validateVideoConfig();

/**
 * Helper function to build caption tracks from environment variables
 * Only includes captions if the environment variable is defined
 */
const buildCaptionTracks = (enUrl?: string, heUrl?: string): CaptionTrack[] => {
  const tracks: CaptionTrack[] = [];
  if (enUrl) tracks.push({ src: enUrl, lang: 'en', label: 'English' });
  if (heUrl) tracks.push({ src: heUrl, lang: 'he', label: 'עברית' });
  return tracks;
};

/**
 * Helper function to build a video asset from environment variable keys
 * Reduces duplication and enforces consistent structure
 */
const buildVideoAsset = (prefix: string): VideoAsset => ({
  src: [
    { src: process.env[`REACT_APP_VIDEO_${prefix}_WEBM_URL`]!, type: 'video/webm' },
    { src: process.env[`REACT_APP_VIDEO_${prefix}_MP4_URL`]!, type: 'video/mp4' },
  ],
  posterSrc: process.env[`REACT_APP_VIDEO_${prefix}_POSTER`]!,
  captions: buildCaptionTracks(
    process.env[`REACT_APP_VIDEO_${prefix}_CAPTIONS_EN`],
    process.env[`REACT_APP_VIDEO_${prefix}_CAPTIONS_HE`]
  ),
});

/**
 * Video assets configuration
 * All URLs from environment variables with NO fallbacks
 */
export const videoConfig: VideoConfig = {
  hero: buildVideoAsset('HERO'),
  aiAssistant: buildVideoAsset('AI'),
  voiceRequest: buildVideoAsset('VOICE_REQUEST'),
  voiceResponse: buildVideoAsset('VOICE_RESPONSE'),
};

/**
 * Video optimization settings
 */
export const videoOptimization = {
  preload: 'metadata' as const,
  playsinline: true,
  muted: true,
  loop: true,
  controls: false,
  disablePictureInPicture: true,
};

/**
 * Platform-specific video settings
 */
export const platformSettings = {
  web: {
    autoplay: true,
    showControls: false,
  },
  mobile: {
    autoplay: false,
    showControls: true,
  },
  tvos: {
    autoplay: false,
    showControls: true,
    usePosterOnly: true,
  },
};

/**
 * Get video settings for current platform
 * Uses shared platform detection for consistency across app
 */
export const getVideoSettings = (): VideoSettings => {
  const platform = detectPlatform();
  return {
    ...videoOptimization,
    ...platformSettings[platform],
  };
};
