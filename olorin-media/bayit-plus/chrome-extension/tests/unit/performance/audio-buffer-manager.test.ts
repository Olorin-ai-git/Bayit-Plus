/**
 * Audio Buffer Manager Tests
 *
 * Tests jitter buffer, network variability handling, and buffer management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioBufferManager } from '@/offscreen/audio-buffer-manager';

describe('AudioBufferManager', () => {
  let bufferManager: AudioBufferManager;
  let mockAudioBuffer: AudioBuffer;

  beforeEach(() => {
    bufferManager = new AudioBufferManager({
      jitterBufferMs: 500,
      maxBufferSize: 10,
      minBufferThreshold: 3,
    });

    // Mock AudioBuffer
    mockAudioBuffer = {
      duration: 0.5, // 500ms
      sampleRate: 16000,
      length: 8000,
      numberOfChannels: 1,
      getChannelData: vi.fn(),
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    } as unknown as AudioBuffer;
  });

  describe('Buffer Addition', () => {
    it('should add buffer to queue', () => {
      bufferManager.addBuffer(mockAudioBuffer);
      expect(bufferManager.getQueueSize()).toBe(1);
      expect(bufferManager.getBufferedDuration()).toBe(0.5);
    });

    it('should track buffered duration correctly', () => {
      bufferManager.addBuffer(mockAudioBuffer);
      bufferManager.addBuffer(mockAudioBuffer);
      bufferManager.addBuffer(mockAudioBuffer);

      expect(bufferManager.getQueueSize()).toBe(3);
      expect(bufferManager.getBufferedDuration()).toBe(1.5);
    });

    it('should drop oldest buffer when queue is full', () => {
      // Fill buffer to max size
      for (let i = 0; i < 10; i++) {
        bufferManager.addBuffer(mockAudioBuffer);
      }

      expect(bufferManager.getQueueSize()).toBe(10);

      // Add one more - should drop oldest
      bufferManager.addBuffer(mockAudioBuffer);

      expect(bufferManager.getQueueSize()).toBe(10);
      expect(bufferManager.getBufferedDuration()).toBe(5.0); // 10 * 0.5s
    });
  });

  describe('Jitter Buffer', () => {
    it('should not be ready to play before jitter buffer fills', () => {
      bufferManager.addBuffer(mockAudioBuffer);
      bufferManager.addBuffer(mockAudioBuffer);

      // Queue has 2 buffers, below minBufferThreshold (3)
      expect(bufferManager.isReadyToPlay()).toBe(false);
      expect(bufferManager.isCurrentlyBuffering()).toBe(false);
    });

    it('should buffer until jitter time elapsed', () => {
      // Add 3 buffers (meets threshold)
      bufferManager.addBuffer(mockAudioBuffer);
      bufferManager.addBuffer(mockAudioBuffer);
      bufferManager.addBuffer(mockAudioBuffer);

      // Immediately after adding - not ready (jitter time not elapsed)
      expect(bufferManager.isReadyToPlay()).toBe(false);
      expect(bufferManager.isCurrentlyBuffering()).toBe(true);
    });

    it('should be ready after jitter time elapsed', async () => {
      // Add 3 buffers
      bufferManager.addBuffer(mockAudioBuffer);
      bufferManager.addBuffer(mockAudioBuffer);
      bufferManager.addBuffer(mockAudioBuffer);

      // Wait for jitter buffer time (500ms)
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(bufferManager.isReadyToPlay()).toBe(true);
      expect(bufferManager.isCurrentlyBuffering()).toBe(false);
    });
  });

  describe('Buffer Retrieval', () => {
    it('should retrieve buffer in FIFO order', () => {
      const buffer1 = { ...mockAudioBuffer, duration: 0.5 } as AudioBuffer;
      const buffer2 = { ...mockAudioBuffer, duration: 0.6 } as AudioBuffer;
      const buffer3 = { ...mockAudioBuffer, duration: 0.7 } as AudioBuffer;

      bufferManager.addBuffer(buffer1);
      bufferManager.addBuffer(buffer2);
      bufferManager.addBuffer(buffer3);

      const retrieved1 = bufferManager.getNextBuffer();
      expect(retrieved1?.duration).toBe(0.5);

      const retrieved2 = bufferManager.getNextBuffer();
      expect(retrieved2?.duration).toBe(0.6);

      const retrieved3 = bufferManager.getNextBuffer();
      expect(retrieved3?.duration).toBe(0.7);
    });

    it('should return null when queue is empty', () => {
      const buffer = bufferManager.getNextBuffer();
      expect(buffer).toBeNull();
    });

    it('should update buffered duration after retrieval', () => {
      bufferManager.addBuffer(mockAudioBuffer);
      bufferManager.addBuffer(mockAudioBuffer);

      expect(bufferManager.getBufferedDuration()).toBe(1.0);

      bufferManager.getNextBuffer();

      expect(bufferManager.getBufferedDuration()).toBe(0.5);
    });
  });

  describe('Buffer State', () => {
    it('should detect low buffer', () => {
      bufferManager.addBuffer(mockAudioBuffer);
      bufferManager.addBuffer(mockAudioBuffer);

      // 2 buffers, below threshold (3)
      expect(bufferManager.isBufferLow()).toBe(true);

      bufferManager.addBuffer(mockAudioBuffer);

      // 3 buffers, at threshold
      expect(bufferManager.isBufferLow()).toBe(false);
    });

    it('should clear all buffers', () => {
      bufferManager.addBuffer(mockAudioBuffer);
      bufferManager.addBuffer(mockAudioBuffer);
      bufferManager.addBuffer(mockAudioBuffer);

      expect(bufferManager.getQueueSize()).toBe(3);

      bufferManager.clear();

      expect(bufferManager.getQueueSize()).toBe(0);
      expect(bufferManager.getBufferedDuration()).toBe(0);
      expect(bufferManager.isCurrentlyBuffering()).toBe(false);
    });
  });

  describe('Buffer Statistics', () => {
    it('should return correct statistics', async () => {
      bufferManager.addBuffer(mockAudioBuffer);
      bufferManager.addBuffer(mockAudioBuffer);
      bufferManager.addBuffer(mockAudioBuffer);

      const stats = bufferManager.getStats();

      expect(stats.queueSize).toBe(3);
      expect(stats.bufferedDuration).toBe(1.5);
      expect(stats.isBuffering).toBe(true);
      expect(stats.isLow).toBe(false);
      expect(stats.config.jitterBufferMs).toBe(500);
      expect(stats.config.maxBufferSize).toBe(10);
      expect(stats.config.minBufferThreshold).toBe(3);
    });
  });
});
