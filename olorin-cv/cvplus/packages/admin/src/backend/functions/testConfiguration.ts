/**
 * Test Configuration Function
 * 
 * Administrative function to test system configuration and service availability.
 * Validates Firebase settings, external service connections, and feature flags.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { onRequest } from 'firebase-functions/v2/https';
import { WebSearchService } from '../services/web-search.service';
import { ConfigurationTestService } from '../services/configuration-test.service';
// Multimedia services temporarily unavailable during cleanup
// import { PodcastGenerationService } from '@cvplus/multimedia/src/services/audio/podcast-generation.service';
// import { VideoGenerationService } from '@cvplus/multimedia/src/services/video/video-generation.service';

// CORS configuration for admin functions
const corsOptions = {
  cors: true
};

export const testConfiguration = onRequest(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    maxInstances: 5,
    ...corsOptions
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Get configuration from admin configuration service
      const configTestService = new ConfigurationTestService();
      const config = await configTestService.getConfiguration();

      const configStatus = {
        firebase: {
          apiKey: !!config.firebase?.apiKey,
          authDomain: !!config.firebase?.authDomain,
          projectId: !!config.firebase?.projectId,
          messagingSenderId: !!config.firebase?.messagingSenderId,
          appId: !!config.firebase?.appId
        },
        storage: {
          bucketName: !!config.storage?.bucketName,
          actualBucket: config.storage?.bucketName
        },
        elevenLabs: {
          apiKey: !!config.elevenLabs?.apiKey,
          host1VoiceId: !!config.elevenLabs?.host1VoiceId,
          host2VoiceId: !!config.elevenLabs?.host2VoiceId,
          actualHost1: config.elevenLabs?.host1VoiceId,
          actualHost2: config.elevenLabs?.host2VoiceId
        },
        openai: {
          apiKey: !!config.openai?.apiKey
        },
        serper: {
          apiKey: !!config.search?.serperApiKey
        },
        videoGeneration: {
          didApiKey: !!config.videoGeneration?.didApiKey,
          avatars: {
            professional: {
              id: !!config.videoGeneration?.avatars?.professional?.id,
              voiceId: !!config.videoGeneration?.avatars?.professional?.voiceId,
              actualId: config.videoGeneration?.avatars?.professional?.id
            },
            friendly: {
              id: !!config.videoGeneration?.avatars?.friendly?.id,
              voiceId: !!config.videoGeneration?.avatars?.friendly?.voiceId
            },
            energetic: {
              id: !!config.videoGeneration?.avatars?.energetic?.id,
              voiceId: !!config.videoGeneration?.avatars?.energetic?.voiceId
            }
          }
        },
        features: {
          enableVideoGeneration: config.features?.enableVideoGeneration,
          enablePodcastGeneration: config.features?.enablePodcastGeneration,
          enablePublicProfiles: config.features?.enablePublicProfiles,
          enableRagChat: config.features?.enableRagChat,
          publicProfilesBaseUrl: config.features?.publicProfiles?.baseUrl
        }
      };

      // Test service initializations
      const serviceStatus = {
        webSearch: {
          available: false,
          error: null as string | null
        },
        podcast: {
          available: false,
          error: null as string | null
        },
        video: {
          available: false,
          error: null as string | null
        }
      };

      try {
        const webSearchService = new WebSearchService();
        serviceStatus.webSearch.available = webSearchService.isAvailable();
      } catch (error: any) {
        serviceStatus.webSearch.error = error.message;
      }

      try {
        // Multimedia services temporarily unavailable during cleanup
        // new PodcastGenerationService();
        serviceStatus.podcast.available = false;
        serviceStatus.podcast.error = 'Service temporarily unavailable during cleanup';
      } catch (error: any) {
        serviceStatus.podcast.error = error.message;
      }

      try {
        // Multimedia services temporarily unavailable during cleanup
        // new VideoGenerationService();
        serviceStatus.video.available = false;
        serviceStatus.video.error = 'Service temporarily unavailable during cleanup';
      } catch (error: any) {
        serviceStatus.video.error = error.message;
      }

      res.json({
        status: 'Configuration test completed',
        config: configStatus,
        services: serviceStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        error: 'Configuration test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);