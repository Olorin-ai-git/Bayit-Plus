import { logger } from 'firebase-functions';

export interface ProviderCapabilities {
  videoGeneration: boolean;
  audioGeneration: boolean;
  imageProcessing: boolean;
  maxDuration?: number;
  supportedFormats?: string[];
}

export class ProviderSelectionEngine {
  private providers: Set<string> = new Set();

  async selectOptimalProvider(requirements: any): Promise<string> {
    logger.debug('Selecting optimal provider', { requirements });
    // Simple provider selection during migration
    return 'heygen'; // Default to heygen for video generation
  }

  registerProvider(providerId: string): void {
    this.providers.add(providerId);
    logger.info(`Registered provider with selection engine: ${providerId}`);
  }

  getProvider(requirements?: any): string {
    logger.debug('Getting provider', { requirements });
    // Return the first available provider or default to heygen
    return Array.from(this.providers)[0] || 'heygen';
  }

  async getProviderCapabilities(provider: string): Promise<ProviderCapabilities> {
    logger.debug('Getting provider capabilities', { provider });
    
    // Simple capabilities mapping
    const capabilities: Record<string, ProviderCapabilities> = {
      heygen: {
        videoGeneration: true,
        audioGeneration: true,
        imageProcessing: false,
        maxDuration: 300,
        supportedFormats: ['mp4', 'webm']
      },
      runwayml: {
        videoGeneration: true,
        audioGeneration: false,
        imageProcessing: true,
        maxDuration: 120,
        supportedFormats: ['mp4']
      }
    };
    
    return capabilities[provider] || {
      videoGeneration: false,
      audioGeneration: false,
      imageProcessing: false
    };
  }
}