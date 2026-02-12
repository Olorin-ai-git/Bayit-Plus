/**
 * Avatar Generation Service
 * Main service for avatar generation with caching and state management
 */

import { ZehAniClient } from './ZehAniClient';
import type {
  AvatarGenerationRequest,
  AvatarGenerationResult,
  AvatarGenerationProgress,
  ZehAniConfig
} from './types';

export class AvatarGenerationService {
  private client: ZehAniClient;
  private cache: Map<string, AvatarGenerationResult> = new Map();
  private progressListeners: Map<string, Set<(progress: AvatarGenerationProgress) => void>> = new Map();

  constructor(config: ZehAniConfig) {
    this.client = new ZehAniClient(config);
  }

  /**
   * Generate avatar
   */
  async generateAvatar(
    request: AvatarGenerationRequest
  ): Promise<AvatarGenerationResult> {
    // Start generation
    const result = await this.client.generateAvatar(request);

    // Cache the result
    this.cache.set(result.avatarId, result);

    // Start polling for progress if not already completed
    if (result.status === 'pending' || result.status === 'processing') {
      this.pollProgress(result.avatarId);
    }

    return result;
  }

  /**
   * Get avatar
   */
  async getAvatar(avatarId: string): Promise<AvatarGenerationResult | null> {
    // Check cache first
    const cached = this.cache.get(avatarId);
    if (cached && cached.status === 'completed') {
      return cached;
    }

    // Fetch from API
    try {
      const result = await this.client.getAvatar(avatarId);
      this.cache.set(avatarId, result);
      return result;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete avatar
   */
  async deleteAvatar(avatarId: string): Promise<boolean> {
    const success = await this.client.deleteAvatar(avatarId);
    if (success) {
      this.cache.delete(avatarId);
      this.progressListeners.delete(avatarId);
    }
    return success;
  }

  /**
   * Get progress
   */
  async getProgress(avatarId: string): Promise<AvatarGenerationProgress> {
    return await this.client.getProgress(avatarId);
  }

  /**
   * Add progress listener
   */
  onProgress(
    avatarId: string,
    listener: (progress: AvatarGenerationProgress) => void
  ): () => void {
    let listeners = this.progressListeners.get(avatarId);
    if (!listeners) {
      listeners = new Set();
      this.progressListeners.set(avatarId, listeners);
    }

    listeners.add(listener);

    // Return unsubscribe function
    return () => {
      listeners?.delete(listener);
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached avatars
   */
  getCachedAvatars(): AvatarGenerationResult[] {
    return Array.from(this.cache.values());
  }

  /**
   * Poll progress for avatar generation
   */
  private async pollProgress(avatarId: string): Promise<void> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        const progress = await this.client.getProgress(avatarId);

        // Notify listeners
        const listeners = this.progressListeners.get(avatarId);
        if (listeners) {
          for (const listener of listeners) {
            try {
              listener(progress);
            } catch (error) {
              // Ignore listener errors
            }
          }
        }

        // Update cache if completed
        if (progress.status === 'completed') {
          const result = await this.client.getAvatar(avatarId);
          this.cache.set(avatarId, result);
          return;
        }

        // Stop polling if failed or expired
        if (progress.status === 'failed' || progress.status === 'expired') {
          return;
        }

        // Continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(() => poll(), 5000);
        }
      } catch (error) {
        // Stop polling on error
      }
    };

    setTimeout(() => poll(), 5000);
  }
}
