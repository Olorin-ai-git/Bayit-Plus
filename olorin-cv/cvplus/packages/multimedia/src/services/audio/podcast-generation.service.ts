/**
 * Podcast Generation Service
 *
 * Real service for podcast generation functionality using ElevenLabs API.
 * Handles podcast script generation and voice synthesis.
 */

export interface PodcastGenerationRequest {
  script: string;
  voiceId?: string;
  settings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
  };
}

export interface PodcastGenerationResult {
  success: boolean;
  audioUrl?: string;
  audioBase64?: string;
  duration?: number;
  characterCount?: number;
  error?: string;
  responseTime?: number;
}

export class PodcastGenerationService {
  private elevenLabsApiKey: string | undefined;
  private openaiApiKey: string | undefined;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }

  /**
   * Check if podcast generation service is available
    */
  isAvailable(): boolean {
    return !!(this.elevenLabsApiKey && this.openaiApiKey);
  }

  /**
   * Test podcast generation functionality
    */
  async testPodcastGeneration(): Promise<{
    success: boolean;
    responseTime?: number;
    error?: string;
    details?: any;
  }> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Required API keys not configured (ElevenLabs and OpenAI)'
      };
    }

    const startTime = Date.now();

    try {
      // Test ElevenLabs connection by fetching available voices
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.elevenLabsApiKey!,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const voices = await response.json();

      return {
        success: true,
        responseTime: Date.now() - startTime,
        details: {
          elevenLabsConnected: true,
          openaiConnected: !!this.openaiApiKey,
          voicesAvailable: voices.voices?.map((v: any) => ({
            id: v.voice_id,
            name: v.name,
            category: v.category
          })) || [],
          estimatedGenerationTime: '2-5 minutes'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Generate podcast audio from script
   */
  async generatePodcast(request: PodcastGenerationRequest): Promise<PodcastGenerationResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Required API keys not configured (ElevenLabs and OpenAI)'
      };
    }

    const startTime = Date.now();

    try {
      const voiceId = request.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default voice

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.elevenLabsApiKey!,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: request.script,
          voice_settings: {
            stability: request.settings?.stability || 0.5,
            similarity_boost: request.settings?.similarityBoost || 0.75,
            style: request.settings?.style || 0.0
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} - ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');

      return {
        success: true,
        audioBase64,
        characterCount: request.script.length,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getAvailableVoices(): Promise<{
    success: boolean;
    voices?: Array<{ id: string; name: string; category: string }>;
    error?: string;
  }> {
    if (!this.elevenLabsApiKey) {
      return {
        success: false,
        error: 'ElevenLabs API key not configured'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.elevenLabsApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        voices: data.voices?.map((v: any) => ({
          id: v.voice_id,
          name: v.name,
          category: v.category
        })) || []
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get service status information
    */
  getServiceStatus(): {
    name: string;
    available: boolean;
    configured: boolean;
    dependencies: Array<{ name: string; available: boolean }>;
    lastTested?: Date;
  } {
    return {
      name: 'Podcast Generation',
      available: this.isAvailable(),
      configured: !!(this.elevenLabsApiKey && this.openaiApiKey),
      dependencies: [
        { name: 'ElevenLabs API', available: !!this.elevenLabsApiKey },
        { name: 'OpenAI API', available: !!this.openaiApiKey }
      ],
      lastTested: new Date()
    };
  }
}