/**
 * Test suite for podcast progress tracking functionality
  */

import { PodcastGenerationService } from '../services/podcast-generation.service';
import * as admin from 'firebase-admin';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        update: jest.fn(),
        get: jest.fn()
      }))
    }))
  })),
  storage: jest.fn(() => ({
    bucket: jest.fn()
  })),
  FieldValue: {
    serverTimestamp: jest.fn()
  }
}));

// Mock OpenAI
jest.mock('openai');

// Mock Axios
jest.mock('axios');

describe('PodcastGenerationService Progress Tracking', () => {
  let service: PodcastGenerationService;

  beforeEach(() => {
    service = new PodcastGenerationService();
    jest.clearAllMocks();
  });

  describe('Progress Tracking', () => {
    test('should initialize progress tracking', async () => {
      const mockUpdate = jest.fn();
      const mockFirestore = admin.firestore as jest.MockedFunction<typeof admin.firestore>;
      mockFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            update: mockUpdate
          }))
        }))
      } as any);

      // Test initialization
      await (service as any).initializeProgress('test-job-123');

      expect(mockUpdate).toHaveBeenCalledWith({
        podcastProgress: expect.objectContaining({
          currentStep: 'script_generation',
          percentage: 0,
          message: 'Starting podcast generation...'
        }),
        updatedAt: expect.anything()
      });
    });

    test('should update progress during generation', async () => {
      const mockUpdate = jest.fn();
      const mockFirestore = admin.firestore as jest.MockedFunction<typeof admin.firestore>;
      mockFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            update: mockUpdate
          }))
        }))
      } as any);

      // Test progress update
      await (service as any).updateProgress(
        'audio_generation',
        50,
        'Generating audio segments...',
        5,
        10
      );

      expect(mockUpdate).toHaveBeenCalledWith({
        podcastProgress: expect.objectContaining({
          currentStep: 'audio_generation',
          currentSegment: 5,
          totalSegments: 10,
          message: 'Generating audio segments...'
        }),
        updatedAt: expect.anything()
      });
    });

    test('should calculate correct overall percentage', async () => {
      const mockUpdate = jest.fn();
      const mockFirestore = admin.firestore as jest.MockedFunction<typeof admin.firestore>;
      mockFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            update: mockUpdate
          }))
        }))
      } as any);

      // Set up service with test job
      (service as any).currentJobId = 'test-job';
      (service as any).startTime = Date.now();

      // Test audio generation at 50% should result in overall ~45%
      // (15% script + 50% of 60% audio = 15 + 30 = 45%)
      await (service as any).updateProgress('audio_generation', 50, 'Test message');

      const lastCall = mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1];
      const progressData = lastCall[0].podcastProgress;
      
      expect(progressData.percentage).toBeGreaterThanOrEqual(40);
      expect(progressData.percentage).toBeLessThanOrEqual(50);
    });

    test('should handle Firestore update failures gracefully', async () => {
      const mockUpdate = jest.fn().mockRejectedValue(new Error('Firestore error'));
      const mockFirestore = admin.firestore as jest.MockedFunction<typeof admin.firestore>;
      mockFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            update: mockUpdate
          }))
        }))
      } as any);

      // Set up service
      (service as any).currentJobId = 'test-job';
      (service as any).startTime = Date.now();

      // Should not throw error even if Firestore fails
      await expect((service as any).updateProgress(
        'script_generation',
        100,
        'Test message'
      )).resolves.not.toThrow();
    });

    test('should estimate time remaining correctly', async () => {
      const mockUpdate = jest.fn();
      const mockFirestore = admin.firestore as jest.MockedFunction<typeof admin.firestore>;
      mockFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            update: mockUpdate
          }))
        }))
      } as any);

      // Set up service with known start time
      const now = Date.now();
      (service as any).currentJobId = 'test-job';
      (service as any).startTime = now - 30000; // 30 seconds ago

      // At 25% progress after 30 seconds, should estimate 90 more seconds
      await (service as any).updateProgress('audio_generation', 10, 'Test message');

      const lastCall = mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1];
      const progressData = lastCall[0].podcastProgress;
      
      expect(progressData.estimatedTimeRemaining).toBeDefined();
      expect(progressData.estimatedTimeRemaining).toBeGreaterThan(0);
    });
  });

  describe('Progress Step Weights', () => {
    test('should have correct step weight distribution', () => {
      const estimation = (service as any).progressEstimation;
      
      expect(estimation.scriptGeneration).toBe(15);
      expect(estimation.audioGeneration).toBe(60);
      expect(estimation.audioMerging).toBe(20);
      expect(estimation.uploading).toBe(5);
      
      // Should sum to 100%
      const total = estimation.scriptGeneration + 
                   estimation.audioGeneration + 
                   estimation.audioMerging + 
                   estimation.uploading;
      expect(total).toBe(100);
    });
  });
});