/**
 * Video Configuration Tests
 * Validates environment variable handling and configuration building
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';

/**
 * Helper to set all required video environment variables
 */
const setRequiredEnvVars = () => {
  process.env.REACT_APP_VIDEO_HERO_WEBM_URL = 'https://cdn.example.com/hero.webm';
  process.env.REACT_APP_VIDEO_HERO_MP4_URL = 'https://cdn.example.com/hero.mp4';
  process.env.REACT_APP_VIDEO_HERO_POSTER = 'https://cdn.example.com/hero-poster.webp';
  process.env.REACT_APP_VIDEO_AI_WEBM_URL = 'https://cdn.example.com/ai.webm';
  process.env.REACT_APP_VIDEO_AI_MP4_URL = 'https://cdn.example.com/ai.mp4';
  process.env.REACT_APP_VIDEO_AI_POSTER = 'https://cdn.example.com/ai-poster.webp';
  process.env.REACT_APP_VIDEO_VOICE_REQUEST_WEBM_URL = 'https://cdn.example.com/voice-request.webm';
  process.env.REACT_APP_VIDEO_VOICE_REQUEST_MP4_URL = 'https://cdn.example.com/voice-request.mp4';
  process.env.REACT_APP_VIDEO_VOICE_REQUEST_POSTER = 'https://cdn.example.com/voice-request-poster.webp';
  process.env.REACT_APP_VIDEO_VOICE_RESPONSE_WEBM_URL = 'https://cdn.example.com/voice-response.webm';
  process.env.REACT_APP_VIDEO_VOICE_RESPONSE_MP4_URL = 'https://cdn.example.com/voice-response.mp4';
  process.env.REACT_APP_VIDEO_VOICE_RESPONSE_POSTER = 'https://cdn.example.com/voice-response-poster.webp';
};

describe('videoConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env and Jest modules before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('Environment Variable Validation', () => {
    it('should throw error when required video URLs are missing', () => {
      // Clear all video environment variables
      delete process.env.REACT_APP_VIDEO_HERO_WEBM_URL;
      delete process.env.REACT_APP_VIDEO_HERO_MP4_URL;
      delete process.env.REACT_APP_VIDEO_HERO_POSTER;
      delete process.env.REACT_APP_VIDEO_AI_WEBM_URL;
      delete process.env.REACT_APP_VIDEO_AI_MP4_URL;
      delete process.env.REACT_APP_VIDEO_AI_POSTER;
      delete process.env.REACT_APP_VIDEO_VOICE_REQUEST_WEBM_URL;
      delete process.env.REACT_APP_VIDEO_VOICE_REQUEST_MP4_URL;
      delete process.env.REACT_APP_VIDEO_VOICE_REQUEST_POSTER;
      delete process.env.REACT_APP_VIDEO_VOICE_RESPONSE_WEBM_URL;
      delete process.env.REACT_APP_VIDEO_VOICE_RESPONSE_MP4_URL;
      delete process.env.REACT_APP_VIDEO_VOICE_RESPONSE_POSTER;

      // This should throw because validation runs at module load
      expect(() => {
        require('../videoConfig');
      }).toThrow('Missing required video configuration');
    });

    it('should not throw when all required variables are present', () => {
      setRequiredEnvVars();

      expect(() => {
        require('../videoConfig');
      }).not.toThrow();
    });
  });

  describe('Caption Track Building', () => {
    it('should include English captions when env var is set', () => {
      setRequiredEnvVars();
      process.env.REACT_APP_VIDEO_HERO_CAPTIONS_EN = 'https://cdn.example.com/hero-en.vtt';

      const { videoConfig } = require('../videoConfig');

      expect(videoConfig.hero.captions).toBeDefined();
      expect(videoConfig.hero.captions.length).toBeGreaterThan(0);
      expect(videoConfig.hero.captions[0].lang).toBe('en');
      expect(videoConfig.hero.captions[0].label).toBe('English');
    });

    it('should include Hebrew captions when env var is set', () => {
      setRequiredEnvVars();
      process.env.REACT_APP_VIDEO_HERO_CAPTIONS_HE = 'https://cdn.example.com/hero-he.vtt';

      const { videoConfig } = require('../videoConfig');

      const hebrewCaption = videoConfig.hero.captions.find((c: { lang: string }) => c.lang === 'he');
      expect(hebrewCaption).toBeDefined();
      expect(hebrewCaption.label).toBe('עברית');
    });

    it('should have empty captions array when no caption env vars set', () => {
      setRequiredEnvVars();
      delete process.env.REACT_APP_VIDEO_HERO_CAPTIONS_EN;
      delete process.env.REACT_APP_VIDEO_HERO_CAPTIONS_HE;

      const { videoConfig } = require('../videoConfig');

      expect(videoConfig.hero.captions).toEqual([]);
    });
  });

  describe('Video Asset Structure', () => {
    it('should have both WebM and MP4 sources for all videos', () => {
      setRequiredEnvVars();
      const { videoConfig } = require('../videoConfig');

      const videos = ['hero', 'aiAssistant', 'voiceRequest', 'voiceResponse'] as const;

      videos.forEach(video => {
        expect(Array.isArray(videoConfig[video].src)).toBe(true);
        expect(videoConfig[video].src.length).toBe(2);
        expect(videoConfig[video].src[0].type).toBe('video/webm');
        expect(videoConfig[video].src[1].type).toBe('video/mp4');
      });
    });

    it('should have poster images for all videos', () => {
      setRequiredEnvVars();
      const { videoConfig } = require('../videoConfig');

      expect(videoConfig.hero.posterSrc).toBeDefined();
      expect(videoConfig.aiAssistant.posterSrc).toBeDefined();
      expect(videoConfig.voiceRequest.posterSrc).toBeDefined();
      expect(videoConfig.voiceResponse.posterSrc).toBeDefined();
    });
  });

  describe('Platform Settings', () => {
    it('should have correct autoplay settings per platform', () => {
      setRequiredEnvVars();
      const { platformSettings } = require('../videoConfig');

      expect(platformSettings.web.autoplay).toBe(true);
      expect(platformSettings.mobile.autoplay).toBe(false);
      expect(platformSettings.tvos.autoplay).toBe(false);
    });

    it('should have usePosterOnly for tvOS', () => {
      setRequiredEnvVars();
      const { platformSettings } = require('../videoConfig');

      expect(platformSettings.tvos.usePosterOnly).toBe(true);
    });
  });
});
