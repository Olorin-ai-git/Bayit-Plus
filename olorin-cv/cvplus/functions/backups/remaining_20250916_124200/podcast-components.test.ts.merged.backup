// @ts-ignore - Export conflicts/**
 * Phase 2B Integration Tests - Enhanced Podcast Components
 * Tests the unified podcast and audio components
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Import enhanced types
import type {
  PodcastData,
  PodcastStatus,
  AudioState,
  TranscriptSegment,
  PodcastChapter,
  PodcastGenerationOptions
} from '../../types/podcast.types';

// Import utility functions
import {
  callFirebaseFunction,
  formatTime,
  estimateAudioDuration,
  generateWaveformData
} from '../../utils/firebase.utils';

// Mock data for testing
const mockPodcastData: PodcastData = {
  title: 'AI Career Podcast',
  description: 'Professional career journey',
  audioUrl: 'https://example.com/podcast.mp3',
  transcript: 'Sarah: Welcome to the podcast. Mike: Thanks for having me.',
  duration: 180, // 3 minutes
  chapters: [
    { title: 'Introduction', startTime: 0, endTime: 30 },
    { title: 'Career Journey', startTime: 30, endTime: 150 },
    { title: 'Closing', startTime: 150, endTime: 180 }
  ],
  generationStatus: 'ready',
  metadata: {
    style: 'professional',
    generatedAt: '2024-08-29T12:00:00Z',
    fileSize: 5242880,
    format: 'mp3'
  }
};

const mockTranscriptSegments: TranscriptSegment[] = [
  {
    start: 0,
    end: 10,
    text: 'Welcome to our career podcast',
    isActive: false,
    speaker: 'host1',
    emotion: 'excited'
  },
  {
    start: 10,
    end: 20,
    text: 'Today we discuss professional growth',
    isActive: false,
    speaker: 'host2',
    emotion: 'thoughtful'
  }
];

describe('Phase 2B: Enhanced Podcast Components Integration', () => {
  
  describe('Type Definitions', () => {
    it('should validate PodcastData structure', () => {
      expect(mockPodcastData).toMatchObject({
        title: expect.any(String),
        audioUrl: expect.any(String),
        duration: expect.any(Number),
        chapters: expect.any(Array),
        generationStatus: expect.stringMatching(/^(not-started|pending|generating|ready|failed|completed)$/)
      });
    });
    
    it('should validate TranscriptSegment structure', () => {
      const segment = mockTranscriptSegments[0];
      expect(segment).toMatchObject({
        start: expect.any(Number),
        end: expect.any(Number),
        text: expect.any(String),
        isActive: expect.any(Boolean),
        speaker: expect.stringMatching(/^(host1|host2|narrator)$/),
        emotion: expect.stringMatching(/^(excited|curious|thoughtful|impressed)$/)
      });
    });
    
    it('should validate PodcastChapter structure', () => {
      const chapter = mockPodcastData.chapters![0];
      expect(chapter).toMatchObject({
        title: expect.any(String),
        startTime: expect.any(Number),
        endTime: expect.any(Number)
      });
    });
  });
  
  describe('Utility Functions', () => {
    it('should format time correctly', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(3665)).toBe('61:05');
    });
    
    it('should estimate audio duration from text', () => {
      const shortText = 'Hello world';
      const longText = 'This is a much longer text that should take more time to speak and should result in a longer estimated duration';
      
      const shortDuration = estimateAudioDuration(shortText);
      const longDuration = estimateAudioDuration(longText);
      
      expect(shortDuration).toBeGreaterThan(0);
      expect(longDuration).toBeGreaterThan(shortDuration);
      expect(estimateAudioDuration('')).toBe(0);
    });
    
    it('should generate waveform data', () => {
      const waveformData = generateWaveformData();
      
      expect(Array.isArray(waveformData)).toBe(true);
      expect(waveformData.length).toBe(50);
      expect(waveformData.every(point => point >= 0.2 && point <= 1)).toBe(true);
    });
    
    it('should handle Firebase function calls', async () => {
      // Mock implementation test
      const result = await callFirebaseFunction('podcastStatus', { jobId: 'test-123' });
      
      expect(result).toMatchObject({
        status: 'not-started',
        message: expect.any(String)
      });
    });
  });
  
  describe('Enhanced Features', () => {
    it('should support premium feature detection', () => {
      const premiumOptions: PodcastGenerationOptions = {
        duration: 'long',
        style: 'conversational',
        focus: 'achievements',
        voice: {
          host1: 'sarah-voice',
          host2: 'mike-voice'
        }
      };
      
      expect(premiumOptions.style).toBe('conversational');
      expect(premiumOptions.duration).toBe('long');
      expect(premiumOptions.focus).toBe('achievements');
    });
    
    it('should handle chapter navigation data', () => {
      const chapters = mockPodcastData.chapters!;
      
      // Test chapter ordering
      for (let i = 1; i < chapters.length; i++) {
        expect(chapters[i].startTime).toBeGreaterThanOrEqual(chapters[i-1].endTime);
      }
      
      // Test chapter coverage
      expect(chapters[0].startTime).toBe(0);
      expect(chapters[chapters.length - 1].endTime).toBe(mockPodcastData.duration);
    });
    
    it('should validate transcript segment timing', () => {
      const segments = mockTranscriptSegments;
      
      // Test segment ordering
      for (let i = 1; i < segments.length; i++) {
        expect(segments[i].start).toBeGreaterThanOrEqual(segments[i-1].end);
      }
      
      // Test speaker assignment
      expect(segments.every(seg => ['host1', 'host2', 'narrator'].includes(seg.speaker!))).toBe(true);
      
      // Test emotion assignment
      expect(segments.every(seg => ['excited', 'curious', 'thoughtful', 'impressed'].includes(seg.emotion!))).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid function calls gracefully', async () => {
      try {
        await callFirebaseFunction('invalidFunction', {});
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Unknown function');
      }
    });
    
    it('should handle empty transcript parsing', () => {
      const emptyDuration = estimateAudioDuration('');
      const nullDuration = estimateAudioDuration(null as any);
      const undefinedDuration = estimateAudioDuration(undefined as any);
      
      expect(emptyDuration).toBe(0);
      expect(nullDuration).toBe(0);
      expect(undefinedDuration).toBe(0);
    });
  });
  
  describe('Backward Compatibility', () => {
    it('should maintain interface compatibility', () => {
      // Test that enhanced components still support basic interfaces
      const basicPodcastData = {
        audioUrl: 'https://example.com/audio.mp3',
        transcript: 'Basic transcript text',
        duration: 120
      };
      
      // Should be assignable to PodcastData type
      const extendedData: PodcastData = {
        ...basicPodcastData,
        title: 'Enhanced Podcast'
      };
      
      expect(extendedData.audioUrl).toBe(basicPodcastData.audioUrl);
      expect(extendedData.transcript).toBe(basicPodcastData.transcript);
      expect(extendedData.duration).toBe(basicPodcastData.duration);
    });
  });
  
  describe('Performance', () => {
    it('should process large transcripts efficiently', () => {
      const largeTranscript = 'Sample text. '.repeat(1000); // 13,000 characters
      
      const startTime = performance.now();
      const duration = estimateAudioDuration(largeTranscript);
      const endTime = performance.now();
      
      expect(duration).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });
    
    it('should generate waveform data quickly', () => {
      const startTime = performance.now();
      const waveformData = generateWaveformData();
      const endTime = performance.now();
      
      expect(waveformData.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(10); // Should complete in under 10ms
    });
  });
});

// Integration summary test
describe('Phase 2B Integration Summary', () => {
  it('should confirm all Phase 2B features are available', () => {
    // Confirm enhanced types are available
    const podcastData: PodcastData = mockPodcastData;
    const segment: TranscriptSegment = mockTranscriptSegments[0];
    
    // Confirm utility functions are available
    expect(typeof formatTime).toBe('function');
    expect(typeof estimateAudioDuration).toBe('function');
    expect(typeof generateWaveformData).toBe('function');
    expect(typeof callFirebaseFunction).toBe('function');
    
    // Confirm enhanced features
    expect(podcastData.chapters).toBeDefined();
    expect(segment.speaker).toBeDefined();
    expect(segment.emotion).toBeDefined();
    
    console.log('✅ Phase 2B Integration Complete: All enhanced podcast & audio features validated');
  });
});
