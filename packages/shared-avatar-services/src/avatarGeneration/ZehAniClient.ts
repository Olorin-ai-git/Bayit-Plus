/**
 * Zeh Ani Client
 * Client for Zeh Ani avatar generation service
 */

import type {
  AvatarGenerationRequest,
  AvatarGenerationResult,
  AvatarGenerationProgress,
  ZehAniConfig,
  ZehAniResponse,
  AvatarGenerationStatus
} from './types';

export class ZehAniClient {
  private config: Required<ZehAniConfig>;

  constructor(config: ZehAniConfig) {
    this.config = {
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
      timeout: config.timeout || 30000,
      retries: config.retries || 3
    };
  }

  /**
   * Generate avatar from photo
   */
  async generateAvatar(
    request: AvatarGenerationRequest
  ): Promise<AvatarGenerationResult> {
    const response = await this.makeRequest<ZehAniResponse>('/generate', {
      method: 'POST',
      body: JSON.stringify({
        userId: request.userId,
        photoUrl: request.photoUrl,
        style: request.style || 'realistic',
        quality: request.quality || 'high',
        options: request.options || {}
      })
    });

    if (!response.success || !response.data) {
      throw new Error(
        response.error?.message || 'Avatar generation failed'
      );
    }

    return {
      avatarId: response.data.avatarId,
      userId: request.userId,
      meshUrl: response.data.meshUrl,
      thumbnailUrl: response.data.thumbnailUrl,
      style: request.style || 'realistic',
      quality: request.quality || 'high',
      createdAt: Date.now(),
      status: this.mapStatus(response.data.status)
    };
  }

  /**
   * Get avatar generation progress
   */
  async getProgress(avatarId: string): Promise<AvatarGenerationProgress> {
    const response = await this.makeRequest<ZehAniResponse>(
      `/progress/${avatarId}`
    );

    if (!response.success || !response.data) {
      throw new Error(
        response.error?.message || 'Failed to get progress'
      );
    }

    return {
      avatarId,
      status: this.mapStatus(response.data.status),
      progress: this.calculateProgress(response.data.status),
      message: response.data.status
    };
  }

  /**
   * Get generated avatar
   */
  async getAvatar(avatarId: string): Promise<AvatarGenerationResult> {
    const response = await this.makeRequest<ZehAniResponse>(
      `/avatar/${avatarId}`
    );

    if (!response.success || !response.data) {
      throw new Error(
        response.error?.message || 'Failed to get avatar'
      );
    }

    return {
      avatarId: response.data.avatarId,
      userId: '', // Not available in this response
      meshUrl: response.data.meshUrl,
      thumbnailUrl: response.data.thumbnailUrl,
      style: 'realistic', // Default
      quality: 'high', // Default
      createdAt: Date.now(),
      status: this.mapStatus(response.data.status)
    };
  }

  /**
   * Delete avatar
   */
  async deleteAvatar(avatarId: string): Promise<boolean> {
    const response = await this.makeRequest<ZehAniResponse>(
      `/avatar/${avatarId}`,
      { method: 'DELETE' }
    );

    return response.success;
  }

  /**
   * Make HTTP request to Zeh Ani API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            ...options.headers
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.retries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Map Zeh Ani status to internal status
   */
  private mapStatus(status: string): AvatarGenerationStatus {
    const statusMap: Record<string, AvatarGenerationStatus> = {
      'pending': 'pending',
      'queued': 'pending',
      'processing': 'processing',
      'generating': 'processing',
      'completed': 'completed',
      'success': 'completed',
      'failed': 'failed',
      'error': 'failed',
      'expired': 'expired'
    };

    return statusMap[status.toLowerCase()] || 'pending';
  }

  /**
   * Calculate progress percentage from status
   */
  private calculateProgress(status: string): number {
    const progressMap: Record<string, number> = {
      'pending': 0.0,
      'queued': 0.1,
      'processing': 0.5,
      'generating': 0.7,
      'completed': 1.0,
      'success': 1.0,
      'failed': 0.0,
      'error': 0.0
    };

    return progressMap[status.toLowerCase()] || 0.0;
  }
}
