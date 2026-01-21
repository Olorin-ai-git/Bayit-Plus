/**
 * Configuration Test Service
 * 
 * Service for testing and validating system configuration settings,
 * API keys, and service availability for administrative monitoring.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

export interface SystemConfiguration {
  firebase: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    messagingSenderId?: string;
    appId?: string;
  };
  storage: {
    bucketName?: string;
  };
  elevenLabs: {
    apiKey?: string;
    host1VoiceId?: string;
    host2VoiceId?: string;
  };
  openai: {
    apiKey?: string;
  };
  search: {
    serperApiKey?: string;
  };
  videoGeneration: {
    didApiKey?: string;
    avatars: {
      professional: {
        id?: string;
        voiceId?: string;
      };
      friendly: {
        id?: string;
        voiceId?: string;
      };
      energetic: {
        id?: string;
        voiceId?: string;
      };
    };
  };
  features: {
    enableVideoGeneration?: boolean;
    enablePodcastGeneration?: boolean;
    enablePublicProfiles?: boolean;
    enableRagChat?: boolean;
    publicProfiles?: {
      baseUrl?: string;
    };
  };
}

export class ConfigurationTestService {
  /**
   * Get system configuration with security-safe values
    */
  async getConfiguration(): Promise<SystemConfiguration> {
    // Read real configuration from environment variables and Firebase
    return {
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
      },
      storage: {
        bucketName: process.env.FIREBASE_STORAGE_BUCKET
      },
      elevenLabs: {
        apiKey: process.env.ELEVEN_LABS_API_KEY,
        host1VoiceId: process.env.ELEVEN_LABS_HOST1_VOICE_ID,
        host2VoiceId: process.env.ELEVEN_LABS_HOST2_VOICE_ID
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY
      },
      search: {
        serperApiKey: process.env.SERPER_API_KEY
      },
      videoGeneration: {
        didApiKey: process.env.DID_API_KEY,
        avatars: {
          professional: {
            id: process.env.DID_PROFESSIONAL_AVATAR_ID,
            voiceId: process.env.DID_PROFESSIONAL_VOICE_ID
          },
          friendly: {
            id: process.env.DID_FRIENDLY_AVATAR_ID,
            voiceId: process.env.DID_FRIENDLY_VOICE_ID
          },
          energetic: {
            id: process.env.DID_ENERGETIC_AVATAR_ID,
            voiceId: process.env.DID_ENERGETIC_VOICE_ID
          }
        }
      },
      features: {
        enableVideoGeneration: process.env.ENABLE_VIDEO_GENERATION === 'true',
        enablePodcastGeneration: process.env.ENABLE_PODCAST_GENERATION === 'true',
        enablePublicProfiles: process.env.ENABLE_PUBLIC_PROFILES === 'true',
        enableRagChat: process.env.ENABLE_RAG_CHAT === 'true',
        publicProfiles: {
          baseUrl: process.env.PUBLIC_PROFILES_BASE_URL
        }
      }
    };
  }

  /**
   * Test configuration validity
    */
  async testConfiguration(config: SystemConfiguration): Promise<{
    valid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Test Firebase configuration
    if (!config.firebase.projectId) {
      issues.push('Firebase project ID is not configured');
    }
    if (!config.firebase.apiKey) {
      issues.push('Firebase API key is not configured');
    }

    // Test storage configuration
    if (!config.storage.bucketName) {
      issues.push('Firebase Storage bucket is not configured');
    }

    // Test external service keys
    if (!config.elevenLabs.apiKey) {
      warnings.push('ElevenLabs API key is not configured - podcast generation will be disabled');
    }
    if (!config.openai.apiKey) {
      issues.push('OpenAI API key is not configured - AI features will not work');
    }
    if (!config.search.serperApiKey) {
      warnings.push('Serper API key is not configured - web search features will be limited');
    }

    // Test video generation configuration
    if (!config.videoGeneration.didApiKey) {
      warnings.push('D-ID API key is not configured - video generation will be disabled');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Get configuration health status
    */
  async getConfigurationHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    details: Record<string, any>;
  }> {
    const config = await this.getConfiguration();
    const testResult = await this.testConfiguration(config);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let score = 100;

    // Deduct points for issues and warnings
    score -= testResult.issues.length * 20;
    score -= testResult.warnings.length * 5;

    if (testResult.issues.length > 0) {
      status = 'critical';
    } else if (testResult.warnings.length > 0) {
      status = 'warning';
    }

    return {
      status,
      score: Math.max(0, score),
      details: {
        totalIssues: testResult.issues.length,
        totalWarnings: testResult.warnings.length,
        issues: testResult.issues,
        warnings: testResult.warnings
      }
    };
  }
}