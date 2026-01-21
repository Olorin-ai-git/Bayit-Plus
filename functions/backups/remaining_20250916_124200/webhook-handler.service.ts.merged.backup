// @ts-ignore - Export conflicts/**
 * Video Provider Webhook Handler Service
 * 
 * Centralized webhook handling for all video generation providers
 * with provider-specific processing and unified status updates.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { VideoGenerationStatus, VideoProviderError, VideoProviderErrorType } from './base-provider.interface';

interface WebhookPayload {
  provider: string;
  signature?: string;
  timestamp?: number;
  data: any;
}

interface WebhookValidationConfig {
  secret: string;
  signatureHeader: string;
  timestampTolerance?: number; // in seconds
}

export class VideoWebhookHandler {
  private readonly validationConfigs: Map<string, WebhookValidationConfig>;
  
  constructor() {
    this.validationConfigs = new Map([
      ['heygen', {
        secret: process.env.HEYGEN_WEBHOOK_SECRET || '',
        signatureHeader: 'x-heygen-signature',
        timestampTolerance: 300 // 5 minutes
      }],
      ['did', {
        secret: process.env.DID_WEBHOOK_SECRET || '',
        signatureHeader: 'x-did-signature',
        timestampTolerance: 300
      }],
      ['runwayml', {
        secret: process.env.RUNWAYML_WEBHOOK_SECRET || '',
        signatureHeader: 'x-runwayml-signature',
        timestampTolerance: 300
      }]
    ]);
  }
  
  /**
   * Process incoming webhook from any provider
   */
  async processWebhook(
    provider: string,
    headers: Record<string, string>,
    payload: any
  ): Promise<VideoGenerationStatus> {
    try {
      
      // Validate webhook authenticity
      await this.validateWebhook(provider, headers, payload);
      
      // Process based on provider
      switch (provider.toLowerCase()) {
        case 'heygen':
          return await this.processHeyGenWebhook(payload);
        case 'did':
          return await this.processDidWebhook(payload);
        case 'runwayml':
          return await this.processRunwayMLWebhook(payload);
        default:
          throw new VideoProviderError(
            VideoProviderErrorType.WEBHOOK_ERROR,
            `Unsupported provider: ${provider}`,
            provider
          );
      }
      
    } catch (error: any) {
      
      if (error instanceof VideoProviderError) {
        throw error;
      }
      
      throw new VideoProviderError(
        VideoProviderErrorType.WEBHOOK_ERROR,
        `Webhook processing failed: ${error.message}`,
        provider,
        false,
        error
      );
    }
  }
  
  /**
   * Process HeyGen webhook payload
   */
  private async processHeyGenWebhook(payload: any): Promise<VideoGenerationStatus> {
    
    // Validate required fields
    if (!payload.video_id || !payload.callback_id) {
      throw new VideoProviderError(
        VideoProviderErrorType.WEBHOOK_ERROR,
        'Invalid HeyGen webhook: missing video_id or callback_id',
        'heygen'
      );
    }
    
    const jobId = payload.callback_id;
    const status: VideoGenerationStatus = {
      jobId,
      providerId: 'heygen',
      status: this.mapHeyGenStatus(payload.status),
      progress: payload.progress || 0,
      videoUrl: payload.video_url,
      thumbnailUrl: payload.thumbnail_url,
      duration: payload.duration,
      error: payload.error ? {
        code: payload.error.code,
        message: payload.error.message,
        retryable: this.isRetryableHeyGenError(payload.error.code)
      } : undefined,
      lastUpdated: new Date()
    };
    
    // Update job status in database
    await this.updateJobStatus(jobId, status);
    
    // Trigger real-time notifications if needed
    await this.notifyStatusUpdate(jobId, status);
    
    
    return status;
  }
  
  /**
   * Process D-ID webhook payload (for fallback compatibility)
   */
  private async processDidWebhook(payload: any): Promise<VideoGenerationStatus> {
    
    // D-ID webhook structure (if they support webhooks)
    const jobId = payload.id || payload.talk_id;
    if (!jobId) {
      throw new VideoProviderError(
        VideoProviderErrorType.WEBHOOK_ERROR,
        'Invalid D-ID webhook: missing job ID',
        'did'
      );
    }
    
    const status: VideoGenerationStatus = {
      jobId,
      providerId: 'did',
      status: this.mapDidStatus(payload.status),
      progress: payload.status === 'done' ? 100 : (payload.status === 'started' ? 50 : 0),
      videoUrl: payload.result_url,
      duration: payload.duration,
      error: payload.error ? {
        code: payload.error.kind || 'UNKNOWN_ERROR',
        message: payload.error.description || 'Unknown error',
        retryable: true
      } : undefined,
      lastUpdated: new Date()
    };
    
    await this.updateJobStatus(jobId, status);
    await this.notifyStatusUpdate(jobId, status);
    
    
    return status;
  }
  
  /**
   * Process RunwayML webhook payload
   */
  private async processRunwayMLWebhook(payload: any): Promise<VideoGenerationStatus> {
    
    const jobId = payload.task?.metadata?.jobId || payload.jobId;
    
    if (!jobId) {
      throw new VideoProviderError(
        VideoProviderErrorType.WEBHOOK_ERROR,
        'Invalid RunwayML webhook: missing job ID',
        'runwayml'
      );
    }
    
    const status: VideoGenerationStatus = {
      jobId,
      providerId: 'runwayml',
      status: this.mapRunwayMLStatus(payload.status),
      progress: payload.progress || (payload.status === 'succeeded' ? 100 : (payload.status === 'processing' ? 50 : 0)),
      videoUrl: payload.output,
      thumbnailUrl: payload.thumbnailUrl,
      duration: payload.metadata?.duration,
      error: payload.error ? {
        code: payload.error.code || 'UNKNOWN_ERROR',
        message: payload.error.message || 'Unknown error',
        retryable: this.isRetryableRunwayMLError(payload.error.code)
      } : undefined,
      lastUpdated: new Date()
    };
    
    await this.updateJobStatus(jobId, status);
    await this.notifyStatusUpdate(jobId, status);
    
    
    return status;
  }
  
  /**
   * Validate webhook signature and timestamp
   */
  private async validateWebhook(
    provider: string,
    headers: Record<string, string>,
    payload: any
  ): Promise<void> {
    const config = this.validationConfigs.get(provider.toLowerCase());
    if (!config || !config.secret) {
      return; // Skip validation if not configured
    }
    
    const signature = headers[config.signatureHeader];
    if (!signature) {
      throw new VideoProviderError(
        VideoProviderErrorType.WEBHOOK_ERROR,
        `Missing signature header: ${config.signatureHeader}`,
        provider
      );
    }
    
    // Validate signature
    const expectedSignature = this.calculateSignature(
      JSON.stringify(payload),
      config.secret
    );
    
    if (!this.verifySignature(signature, expectedSignature)) {
      throw new VideoProviderError(
        VideoProviderErrorType.WEBHOOK_ERROR,
        'Invalid webhook signature',
        provider
      );
    }
    
    // Validate timestamp if provided
    if (payload.timestamp && config.timestampTolerance) {
      const now = Math.floor(Date.now() / 1000);
      const tolerance = config.timestampTolerance;
      
      if (Math.abs(now - payload.timestamp) > tolerance) {
        throw new VideoProviderError(
          VideoProviderErrorType.WEBHOOK_ERROR,
          'Webhook timestamp outside tolerance window',
          provider
        );
      }
    }
  }
  
  /**
   * Calculate HMAC signature for webhook validation
   */
  private calculateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
  }
  
  /**
   * Verify webhook signature using secure comparison
   */
  private verifySignature(received: string, expected: string): boolean {
    // Remove any prefix (like "sha256=")
    const cleanReceived = received.replace(/^sha256=/, '');
    const cleanExpected = expected.replace(/^sha256=/, '');
    
    // Use crypto.timingSafeEqual for secure comparison
    if (cleanReceived.length !== cleanExpected.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(cleanReceived, 'hex'),
      Buffer.from(cleanExpected, 'hex')
    );
  }
  
  /**
   * Map HeyGen status to standardized status
   */
  private mapHeyGenStatus(heygenStatus: string): 'queued' | 'processing' | 'completed' | 'failed' {
    switch (heygenStatus?.toLowerCase()) {
      case 'queued':
        return 'queued';
      case 'processing':
      case 'generating':
        return 'processing';
      case 'completed':
      case 'done':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'processing';
    }
  }
  
  /**
   * Map D-ID status to standardized status
   */
  private mapDidStatus(didStatus: string): 'queued' | 'processing' | 'completed' | 'failed' {
    switch (didStatus?.toLowerCase()) {
      case 'created':
      case 'submitted':
        return 'queued';
      case 'started':
      case 'processing':
        return 'processing';
      case 'done':
      case 'completed':
        return 'completed';
      case 'error':
      case 'failed':
        return 'failed';
      default:
        return 'processing';
    }
  }
  
  /**
   * Map RunwayML status to standardized status
   */
  private mapRunwayMLStatus(runwaymlStatus: string): 'queued' | 'processing' | 'completed' | 'failed' {
    switch (runwaymlStatus?.toLowerCase()) {
      case 'pending':
        return 'queued';
      case 'processing':
      case 'running':
        return 'processing';
      case 'succeeded':
      case 'completed':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'processing';
    }
  }
  
  /**
   * Check if HeyGen error is retryable
   */
  private isRetryableHeyGenError(errorCode: string): boolean {
    const retryableErrors = [
      'RATE_LIMIT_EXCEEDED',
      'TEMPORARY_UNAVAILABLE',
      'PROCESSING_TIMEOUT',
      'NETWORK_ERROR',
      'SERVER_ERROR'
    ];
    return retryableErrors.includes(errorCode);
  }
  
  /**
   * Check if RunwayML error is retryable
   */
  private isRetryableRunwayMLError(errorCode: string): boolean {
    const retryableErrors = [
      'RATE_LIMIT_EXCEEDED',
      'TEMPORARY_UNAVAILABLE',
      'PROCESSING_TIMEOUT',
      'NETWORK_ERROR',
      'SERVER_ERROR'
    ];
    return retryableErrors.includes(errorCode);
  }
  
  /**
   * Update job status in Firestore
   */
  private async updateJobStatus(
    jobId: string,
    status: VideoGenerationStatus
  ): Promise<void> {
    try {
      const db = admin.firestore();
      
      // Update provider-specific collection
      await db.collection(`${status.providerId}_jobs`).doc(jobId).set({
        ...status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      // Update main job document
      const jobRef = db.collection('jobs').doc(jobId);
      const jobDoc = await jobRef.get();
      
      if (jobDoc.exists) {
        const updateData: any = {
          'videoGeneration.status': status.status,
          'videoGeneration.progress': status.progress,
          'videoGeneration.provider': status.providerId,
          'videoGeneration.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (status.videoUrl) {
          updateData['videoGeneration.videoUrl'] = status.videoUrl;
        }
        
        if (status.thumbnailUrl) {
          updateData['videoGeneration.thumbnailUrl'] = status.thumbnailUrl;
        }
        
        if (status.duration) {
          updateData['videoGeneration.duration'] = status.duration;
        }
        
        if (status.error) {
          updateData['videoGeneration.error'] = status.error;
        }
        
        await jobRef.update(updateData);
        
      } else {
      }
      
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Notify clients of status updates via real-time channels
   */
  private async notifyStatusUpdate(
    jobId: string,
    status: VideoGenerationStatus
  ): Promise<void> {
    try {
      // In a real implementation, this could:
      // 1. Send Firebase Cloud Messaging notifications
      // 2. Update real-time database for live UI updates
      // 3. Trigger email notifications for completion
      // 4. Send WebSocket updates to connected clients
      
      
      // For now, just log the notification
      // Future: Implement real-time notification system
      
    } catch (error) {
      // Don't throw - notifications are non-critical
    }
  }
  
  /**
   * Get webhook configuration for a provider
   */
  public getWebhookConfig(provider: string): WebhookValidationConfig | undefined {
    return this.validationConfigs.get(provider.toLowerCase());
  }
  
  /**
   * Update webhook configuration for a provider
   */
  public updateWebhookConfig(
    provider: string,
    config: WebhookValidationConfig
  ): void {
    this.validationConfigs.set(provider.toLowerCase(), config);
  }
}

// Export singleton instance
export const videoWebhookHandler = new VideoWebhookHandler();