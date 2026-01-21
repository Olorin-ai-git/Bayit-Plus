// @ts-ignore - Export conflicts/**
 * T011: Multimedia service logging test in packages/multimedia/src/__tests__/multimedia-logging.integration.test.ts
 * CRITICAL: This test MUST FAIL before implementation
 */

import { MultimediaLogger } from '../logging/MultimediaLogger';
import { LogLevel, LogDomain } from '@cvplus/logging/backend';

describe('MultimediaLogger Integration', () => {
  let multimediaLogger: MultimediaLogger;

  beforeEach(() => {
    multimediaLogger = new MultimediaLogger('multimedia-service-test');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Media Processing Event Logging', () => {
    it('should log media upload with file metadata', async () => {
      const mockUploadData = {
        userId: 'user-media-test',
        fileName: 'profile-video.mp4',
        fileSize: 52428800, // 50MB
        fileType: 'video/mp4',
        uploadMethod: 'direct',
        processingIntent: 'profile_video'
      };

      const correlationId = multimediaLogger.mediaUploadStarted(mockUploadData);

      expect(correlationId).toBeDefined();
      expect(correlationId).toMatch(/^[a-zA-Z0-9\-_]{21}$/);

      const logEntry = multimediaLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.BUSINESS,
        message: 'Media upload started',
        context: {
          event: 'MEDIA_UPLOAD_STARTED',
          userId: 'user-media-test',
          fileName: 'profile-video.mp4',
          fileSize: 52428800,
          fileType: 'video/mp4',
          uploadMethod: 'direct',
          processingIntent: 'profile_video'
        },
        correlationId: expect.any(String)
      });
    });

    it('should log video generation with AI service details', async () => {
      const mockVideoGeneration = {
        userId: 'user-video-gen',
        videoType: 'ai_avatar',
        aiService: 'D-ID',
        scriptLength: 245,
        avatarId: 'avatar-professional-male-1',
        resolution: '1080p',
        estimatedDuration: 45
      };

      const correlationId = multimediaLogger.videoGenerationStarted(mockVideoGeneration);

      expect(correlationId).toBeDefined();

      const logEntry = multimediaLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.BUSINESS,
        message: 'AI video generation started',
        context: {
          event: 'VIDEO_GENERATION_STARTED',
          userId: 'user-video-gen',
          videoType: 'ai_avatar',
          aiService: 'D-ID',
          scriptLength: 245,
          avatarId: 'avatar-professional-male-1',
          resolution: '1080p'
        },
        correlationId: expect.any(String)
      });
    });

    it('should log audio processing with quality metrics', async () => {
      const mockAudioProcessing = {
        audioId: 'audio-podcast-123',
        processingType: 'podcast_generation',
        aiService: 'ElevenLabs',
        voiceId: 'voice-professional-female',
        textLength: 1200,
        qualitySettings: 'high',
        outputFormat: 'mp3'
      };

      const correlationId = multimediaLogger.audioProcessingCompleted(mockAudioProcessing);

      expect(correlationId).toBeDefined();

      const logEntry = multimediaLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.PERFORMANCE,
        message: 'Audio processing completed',
        context: {
          event: 'AUDIO_PROCESSING_COMPLETED',
          audioId: 'audio-podcast-123',
          processingType: 'podcast_generation',
          aiService: 'ElevenLabs',
          voiceId: 'voice-professional-female',
          textLength: 1200,
          qualitySettings: 'high',
          outputFormat: 'mp3'
        }
      });
    });

    it('should log media storage operations with size and location', async () => {
      const mockStorageOperation = {
        operation: 'upload',
        bucketName: 'cvplus-media-prod',
        filePath: 'user-profiles/user-123/video-intro.mp4',
        fileSize: 25600000, // 25MB
        storageClass: 'STANDARD',
        metadata: {
          contentType: 'video/mp4',
          userId: 'user-123',
          processingId: 'proc-456'
        }
      };

      const correlationId = multimediaLogger.storageOperation(mockStorageOperation);

      expect(correlationId).toBeDefined();

      const logEntry = multimediaLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.SYSTEM,
        message: 'Media storage operation completed',
        context: {
          event: 'STORAGE_OPERATION',
          operation: 'upload',
          bucketName: 'cvplus-media-prod',
          filePath: 'user-profiles/user-123/video-intro.mp4',
          fileSize: 25600000,
          storageClass: 'STANDARD'
        }
      });
    });
  });

  describe('AI Service Integration Logging', () => {
    it('should log AI service costs and usage metrics', async () => {
      const mockAIServiceCall = {
        service: 'D-ID',
        endpoint: '/videos',
        requestType: 'avatar_video_generation',
        inputTokens: 0, // Video generation doesn't use tokens
        credits: 1.5,
        cost: 0.15,
        duration: 45000,
        success: true,
        responseSize: 'video_file'
      };

      const correlationId = multimediaLogger.aiServiceCalled(mockAIServiceCall);

      expect(correlationId).toBeDefined();

      const logEntry = multimediaLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.PERFORMANCE,
        message: 'AI service call completed',
        context: {
          event: 'AI_SERVICE_CALLED',
          service: 'D-ID',
          endpoint: '/videos',
          requestType: 'avatar_video_generation',
          credits: 1.5,
          cost: 0.15,
          success: true
        },
        performance: {
          duration: 45000
        }
      });
    });

    it('should log media processing failures with recovery strategies', async () => {
      const mockProcessingFailure = {
        mediaId: 'media-fail-test',
        processingType: 'video_compression',
        errorType: 'CODEC_UNSUPPORTED',
        errorMessage: 'Video codec not supported for web playback',
        originalFormat: 'mov',
        targetFormat: 'mp4',
        recoveryStrategy: 'transcode_with_fallback_codec',
        processingDuration: 12000
      };

      const correlationId = multimediaLogger.processingFailed(mockProcessingFailure);

      expect(correlationId).toBeDefined();

      const logEntry = multimediaLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.ERROR,
        domain: LogDomain.SYSTEM,
        message: 'Media processing failed',
        context: {
          event: 'PROCESSING_FAILED',
          mediaId: 'media-fail-test',
          processingType: 'video_compression',
          errorType: 'CODEC_UNSUPPORTED',
          originalFormat: 'mov',
          targetFormat: 'mp4',
          recoveryStrategy: 'transcode_with_fallback_codec'
        },
        error: {
          message: 'Video codec not supported for web playback',
          code: 'CODEC_UNSUPPORTED'
        },
        performance: {
          duration: 12000
        }
      });
    });
  });

  describe('Performance and Resource Monitoring', () => {
    it('should track media processing performance with alerts', async () => {
      const performanceTests = [
        { duration: 8000, size: 5000000, expectLevel: LogLevel.INFO }, // Fast processing
        { duration: 30000, size: 25000000, expectLevel: LogLevel.INFO }, // Normal processing
        { duration: 120000, size: 50000000, expectLevel: LogLevel.WARN }, // Slow processing
        { duration: 300000, size: 100000000, expectLevel: LogLevel.ERROR } // Very slow processing
      ];

      performanceTests.forEach(({ duration, size, expectLevel }, index) => {
        multimediaLogger.processingCompleted({
          mediaId: `media-perf-test-${index}`,
          processingDuration: duration,
          fileSize: size,
          processingType: 'video_optimization',
          qualityScore: 0.85
        });

        const logs = multimediaLogger.getAllLogEntries();
        const latestLog = logs[logs.length - 1];

        expect(latestLog.level).toBe(expectLevel);
        expect(latestLog.performance?.duration).toBe(duration);
      });
    });

    it('should log storage quota and usage warnings', async () => {
      const mockQuotaWarning = {
        userId: 'user-quota-test',
        currentUsage: 4800000000, // 4.8GB
        quotaLimit: 5000000000, // 5GB
        utilizationPercent: 96,
        mediaTypes: {
          videos: 3200000000,
          audio: 800000000,
          images: 800000000
        }
      };

      const correlationId = multimediaLogger.quotaWarning(mockQuotaWarning);

      expect(correlationId).toBeDefined();

      const logEntry = multimediaLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.WARN,
        domain: LogDomain.SYSTEM,
        message: 'User approaching storage quota limit',
        context: {
          event: 'QUOTA_WARNING',
          userId: 'user-quota-test',
          currentUsage: 4800000000,
          quotaLimit: 5000000000,
          utilizationPercent: 96
        }
      });
    });
  });
});