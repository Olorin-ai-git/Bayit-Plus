import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getStorage, Storage } from 'firebase-admin/storage';

/**
 * Video generation providers
 */
export enum VideoProvider {
  HEYGEN = 'HEYGEN',
  RUNWAY_ML = 'RUNWAY_ML',
  DID = 'DID',
  FFMPEG = 'FFMPEG',
}

/**
 * Video generation status
 */
export enum VideoStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Video generation configuration
 */
export interface VideoGenerationConfig {
  provider?: VideoProvider;
  avatarId?: string;
  voiceId?: string;
  script?: string;
  duration?: number;
  resolution?: '720p' | '1080p' | '4k';
  format?: 'mp4' | 'webm';
  watermark?: boolean;
  background?: string;
  transitions?: boolean;
}

/**
 * Video generation job
 */
export interface VideoGenerationJob {
  id?: string;
  userId: string;
  config: VideoGenerationConfig;
  status: VideoStatus;
  provider: VideoProvider;
  providerJobId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
  progress?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Provider credentials configuration
 */
export interface ProviderCredentials {
  provider: VideoProvider;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  webhookUrl?: string;
}

/**
 * Video generation metrics
 */
export interface VideoMetrics {
  totalGenerated: number;
  byProvider: Record<VideoProvider, number>;
  byStatus: Record<VideoStatus, number>;
  averageGenerationTime: number;
  successRate: number;
  totalDuration: number;
  totalFileSize: number;
}

/**
 * Service for multi-provider video generation
 */
export class VideoGenerationService {
  private static instance: VideoGenerationService;
  private db: Firestore | null = null;
  private storage: Storage | null = null;
  private app: App | null = null;
  private providerCredentials: Map<VideoProvider, ProviderCredentials> = new Map();
  private providerOrder: VideoProvider[] = [
    VideoProvider.HEYGEN,
    VideoProvider.RUNWAY_ML,
    VideoProvider.DID,
    VideoProvider.FFMPEG,
  ];

  private constructor() {
    // Lazy initialization
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): VideoGenerationService {
    if (!VideoGenerationService.instance) {
      VideoGenerationService.instance = new VideoGenerationService();
    }
    return VideoGenerationService.instance;
  }

  /**
   * Initialize Firebase connections
   */
  private initializeFirebase(): void {
    if (this.db && this.storage) return;

    try {
      if (getApps().length === 0) {
        this.app = initializeApp();
      } else {
        this.app = getApps()[0];
      }
      this.db = getFirestore(this.app);
      this.storage = getStorage(this.app);
      logger.info('[VideoGenerationService] Firebase initialized');
    } catch (error) {
      logger.error('[VideoGenerationService] Failed to initialize Firebase:', error);
    }
  }

  /**
   * Generate video from CV data
   */
  public async generateVideo(
    userId: string,
    config: VideoGenerationConfig
  ): Promise<VideoGenerationJob> {
    try {
      this.initializeFirebase();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      // Select provider
      const provider = config.provider || this.selectBestProvider();

      // Create job
      const job: Omit<VideoGenerationJob, 'id'> = {
        userId,
        config,
        status: VideoStatus.PENDING,
        provider,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          clientVersion: '1.0.0',
        },
      };

      const docRef = await this.db.collection('video_generations').add(job);

      logger.info(`[VideoGeneration] Job created: ${docRef.id} with provider ${provider}`);

      // Start generation asynchronously
      this.startGeneration(docRef.id, provider, config).catch((error) => {
        logger.error(`[VideoGeneration] Failed to start job ${docRef.id}:`, error);
      });

      return { id: docRef.id, ...job };
    } catch (error) {
      logger.error('[VideoGeneration] Failed to generate video:', error);
      throw error;
    }
  }

  /**
   * Get video generation status
   */
  public async getVideoStatus(jobId: string): Promise<VideoGenerationJob> {
    try {
      this.initializeFirebase();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const doc = await this.db.collection('video_generations').doc(jobId).get();

      if (!doc.exists) {
        throw new Error(`Video generation job not found: ${jobId}`);
      }

      return { id: doc.id, ...doc.data() } as VideoGenerationJob;
    } catch (error) {
      logger.error(`[VideoGeneration] Failed to get status for ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get video preview/thumbnail
   */
  public async getVideoPreview(jobId: string): Promise<string | null> {
    try {
      const job = await this.getVideoStatus(jobId);
      return job.thumbnailUrl || null;
    } catch (error) {
      logger.error(`[VideoGeneration] Failed to get preview for ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Download completed video
   */
  public async downloadVideo(jobId: string, format: 'mp4' | 'webm' = 'mp4'): Promise<string> {
    try {
      const job = await this.getVideoStatus(jobId);

      if (job.status !== VideoStatus.COMPLETED) {
        throw new Error(`Video not ready: status is ${job.status}`);
      }

      if (!job.videoUrl) {
        throw new Error('Video URL not available');
      }

      // If format conversion needed, trigger conversion
      if (job.config.format !== format) {
        logger.info(`[VideoGeneration] Converting video from ${job.config.format} to ${format}`);
        // Note: Implementation pending for format conversion via FFmpeg
      }

      return job.videoUrl;
    } catch (error) {
      logger.error(`[VideoGeneration] Failed to download video ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Upload generated video to Cloud Storage
   */
  public async uploadVideoToStorage(jobId: string, fileBuffer: Buffer): Promise<string> {
    try {
      this.initializeFirebase();

      if (!this.storage) {
        throw new Error('Storage not initialized');
      }

      const bucket = this.storage.bucket();
      const fileName = `videos/${jobId}/output.mp4`;
      const file = bucket.file(fileName);

      await file.save(fileBuffer, {
        metadata: {
          contentType: 'video/mp4',
          metadata: {
            jobId,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Make file publicly accessible
      await file.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      // Update job with video URL
      if (this.db) {
        await this.db.collection('video_generations').doc(jobId).update({
          videoUrl: publicUrl,
          updatedAt: new Date(),
        });
      }

      logger.info(`[VideoGeneration] Video uploaded for job ${jobId}: ${publicUrl}`);

      return publicUrl;
    } catch (error) {
      logger.error(`[VideoGeneration] Failed to upload video for ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Configure video provider credentials
   */
  public async configureVideoProvider(
    provider: VideoProvider,
    credentials: ProviderCredentials
  ): Promise<void> {
    try {
      this.initializeFirebase();

      this.providerCredentials.set(provider, credentials);

      // Persist to Firestore (encrypted in production)
      if (this.db) {
        await this.db
          .collection('video_provider_configs')
          .doc(provider)
          .set(
            {
              ...credentials,
              updatedAt: new Date(),
            },
            { merge: true }
          );
      }

      logger.info(`[VideoGeneration] Provider ${provider} configured`);
    } catch (error) {
      logger.error(`[VideoGeneration] Failed to configure provider ${provider}:`, error);
      throw error;
    }
  }

  /**
   * List available video templates
   */
  public async listAvailableVideoTemplates(): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      provider: VideoProvider;
      duration: number;
      preview?: string;
    }>
  > {
    try {
      this.initializeFirebase();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const snapshot = await this.db.collection('video_templates').get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];
    } catch (error) {
      logger.error('[VideoGeneration] Failed to list templates:', error);
      return [];
    }
  }

  /**
   * Customize video template
   */
  public async customizeVideoTemplate(
    templateId: string,
    customizations: Record<string, any>
  ): Promise<VideoGenerationConfig> {
    try {
      this.initializeFirebase();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const templateDoc = await this.db.collection('video_templates').doc(templateId).get();

      if (!templateDoc.exists) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const template = templateDoc.data() as VideoGenerationConfig;

      // Merge template with customizations
      const config: VideoGenerationConfig = {
        ...template,
        ...customizations,
      };

      logger.info(`[VideoGeneration] Template ${templateId} customized`);

      return config;
    } catch (error) {
      logger.error('[VideoGeneration] Failed to customize template:', error);
      throw error;
    }
  }

  /**
   * Cancel video generation
   */
  public async cancelVideoGeneration(jobId: string): Promise<void> {
    try {
      this.initializeFirebase();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const job = await this.getVideoStatus(jobId);

      if (job.status === VideoStatus.COMPLETED) {
        throw new Error('Cannot cancel completed job');
      }

      // Cancel provider job if exists
      if (job.providerJobId) {
        await this.cancelProviderJob(job.provider, job.providerJobId);
      }

      // Update job status
      await this.db.collection('video_generations').doc(jobId).update({
        status: VideoStatus.CANCELLED,
        updatedAt: new Date(),
      });

      logger.info(`[VideoGeneration] Job ${jobId} cancelled`);
    } catch (error) {
      logger.error(`[VideoGeneration] Failed to cancel job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get video generation metrics
   */
  public async getVideoGenerationMetrics(timeRange: {
    start: Date;
    end: Date;
  }): Promise<VideoMetrics> {
    try {
      this.initializeFirebase();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const snapshot = await this.db
        .collection('video_generations')
        .where('createdAt', '>=', timeRange.start)
        .where('createdAt', '<=', timeRange.end)
        .get();

      const byProvider: Record<VideoProvider, number> = {} as any;
      const byStatus: Record<VideoStatus, number> = {} as any;
      let totalDuration = 0;
      let totalFileSize = 0;
      let totalGenerationTime = 0;
      let completedJobs = 0;

      snapshot.docs.forEach((doc) => {
        const job = doc.data() as VideoGenerationJob;

        byProvider[job.provider] = (byProvider[job.provider] || 0) + 1;
        byStatus[job.status] = (byStatus[job.status] || 0) + 1;

        if (job.duration) totalDuration += job.duration;
        if (job.fileSize) totalFileSize += job.fileSize;

        if (job.status === VideoStatus.COMPLETED && job.completedAt) {
          const generationTime = job.completedAt.getTime() - job.createdAt.getTime();
          totalGenerationTime += generationTime;
          completedJobs++;
        }
      });

      const totalGenerated = snapshot.size;
      const successRate =
        totalGenerated > 0 ? (byStatus[VideoStatus.COMPLETED] || 0) / totalGenerated : 0;
      const averageGenerationTime = completedJobs > 0 ? totalGenerationTime / completedJobs : 0;

      return {
        totalGenerated,
        byProvider,
        byStatus,
        averageGenerationTime,
        successRate,
        totalDuration,
        totalFileSize,
      };
    } catch (error) {
      logger.error('[VideoGeneration] Failed to get metrics:', error);
      throw error;
    }
  }

  /**
   * Start video generation with specific provider
   */
  private async startGeneration(
    jobId: string,
    provider: VideoProvider,
    config: VideoGenerationConfig
  ): Promise<void> {
    try {
      if (!this.db) return;

      // Update status to processing
      await this.db.collection('video_generations').doc(jobId).update({
        status: VideoStatus.PROCESSING,
        progress: 10,
        updatedAt: new Date(),
      });

      let providerJobId: string;

      // Call provider-specific generation
      switch (provider) {
        case VideoProvider.HEYGEN:
          providerJobId = await this.generateViaHeyGen(config);
          break;
        case VideoProvider.RUNWAY_ML:
          providerJobId = await this.generateViaRunwayML(config);
          break;
        case VideoProvider.DID:
          providerJobId = await this.generateViaDID(config);
          break;
        case VideoProvider.FFMPEG:
          providerJobId = await this.generateViaFFmpeg(config);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Update with provider job ID
      await this.db.collection('video_generations').doc(jobId).update({
        providerJobId,
        progress: 50,
        updatedAt: new Date(),
      });

      logger.info(`[VideoGeneration] Provider job started: ${providerJobId}`);
    } catch (error) {
      logger.error(`[VideoGeneration] Failed to start generation for ${jobId}:`, error);

      if (this.db) {
        await this.db.collection('video_generations').doc(jobId).update({
          status: VideoStatus.FAILED,
          error: (error as Error).message,
          updatedAt: new Date(),
        });
      }
    }
  }

  /**
   * Generate video via HeyGen
   */
  private async generateViaHeyGen(config: VideoGenerationConfig): Promise<string> {
    // Production: Integrate with HeyGen API
    // const response = await axios.post('https://api.heygen.com/v1/video/generate', { ... });
    // return response.data.video_id;

    logger.info('[VideoGeneration] HeyGen: Starting generation');
    return `heygen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate video via Runway ML
   */
  private async generateViaRunwayML(config: VideoGenerationConfig): Promise<string> {
    // Production: Integrate with Runway ML API
    // const response = await axios.post('https://api.runwayml.com/v1/generate', { ... });
    // return response.data.id;

    logger.info('[VideoGeneration] Runway ML: Starting generation');
    return `runway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate video via D-ID
   */
  private async generateViaDID(config: VideoGenerationConfig): Promise<string> {
    // Production: Integrate with D-ID API
    // const response = await axios.post('https://api.d-id.com/talks', { ... });
    // return response.data.id;

    logger.info('[VideoGeneration] D-ID: Starting generation');
    return `did_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate video via FFmpeg (fallback)
   */
  private async generateViaFFmpeg(config: VideoGenerationConfig): Promise<string> {
    // Production: Use FFmpeg for basic video generation
    // const ffmpeg = require('fluent-ffmpeg');
    // ... FFmpeg processing logic

    logger.info('[VideoGeneration] FFmpeg: Starting generation');
    return `ffmpeg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cancel provider-specific job
   */
  private async cancelProviderJob(provider: VideoProvider, providerJobId: string): Promise<void> {
    logger.info(`[VideoGeneration] Cancelling ${provider} job: ${providerJobId}`);

    // Production: Call provider-specific cancellation APIs
    switch (provider) {
      case VideoProvider.HEYGEN:
        // await axios.delete(`https://api.heygen.com/v1/video/${providerJobId}`);
        break;
      case VideoProvider.RUNWAY_ML:
        // await axios.post(`https://api.runwayml.com/v1/cancel/${providerJobId}`);
        break;
      case VideoProvider.DID:
        // await axios.delete(`https://api.d-id.com/talks/${providerJobId}`);
        break;
    }
  }

  /**
   * Select best available provider
   */
  private selectBestProvider(): VideoProvider {
    // Production: Check provider availability, quotas, and performance
    // For now, return first provider
    return this.providerOrder[0];
  }
}

// Export singleton instance
export const videoGenerationService = VideoGenerationService.getInstance();
