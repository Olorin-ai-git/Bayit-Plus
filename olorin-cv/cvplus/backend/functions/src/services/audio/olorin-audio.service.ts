/**
 * Olorin Audio Service
 *
 * Integrates with existing Olorin ecosystem TTS/STT services from:
 * - bayit-plus: ElevenLabs TTS streaming service
 * - israeli-radio: ElevenLabs voice service
 *
 * NO STUBS - Reuses production Olorin services
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import axios, { AxiosInstance } from 'axios';
import http from 'http';
import https from 'https';
import { logger } from '../../utils/logger';
import { TTSOptions, STTOptions } from '../../types/audio';
import { getConfig } from '../../config/audio.config';

/**
 * Olorin TTS Service Integration
 *
 * Connects to bayit-plus ElevenLabs TTS streaming service
 * Provides streaming audio generation with <500ms first chunk latency
 */
export class OlorinTTSService {
  private apiClient: AxiosInstance;
  private config: ReturnType<typeof getConfig>;

  constructor() {
    this.config = getConfig();
    this.apiClient = axios.create({
      baseURL: this.config.olorinTTSBaseURL,
      timeout: this.config.ttsTimeout,
      httpAgent: new http.Agent({
        keepAlive: true,
        maxSockets: 50,
        keepAliveMsecs: 60000,
      }),
      httpsAgent: new https.Agent({
        keepAlive: true,
        maxSockets: 50,
        keepAliveMsecs: 60000,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate audio from text using Olorin TTS (bayit-plus ElevenLabs)
   *
   * @param text - Text to convert to speech
   * @param options - Voice, language, and streaming options
   * @returns Async generator yielding audio chunks
   */
  async *generateSpeech(text: string, options: TTSOptions): AsyncGenerator<Buffer> {
    const startTime = Date.now();

    try {
      // Validate text length
      if (text.length > this.config.maxTextLength) {
        throw new Error(`Text exceeds maximum length of ${this.config.maxTextLength} characters`);
      }

      // Get API key from Secret Manager
      const apiKey = await this.getAPIKey();

      // Request streaming TTS from Olorin service
      const response = await this.apiClient.post(
        '/api/tts/stream',
        {
          text,
          voice: options.voice || this.config.defaultVoice,
          language: options.language || 'en',
          model: options.model || 'eleven_multilingual_v2',
          stability: options.stability || 0.5,
          similarityBoost: options.similarityBoost || 0.75,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          responseType: 'stream',
        }
      );

      const firstChunkTime = Date.now();
      const latencyMs = firstChunkTime - startTime;

      logger.info('TTS streaming started', {
        latencyMs,
        textLength: text.length,
        voice: options.voice,
        language: options.language,
      });

      // Warn if first chunk latency exceeds target
      if (latencyMs > 500) {
        logger.warn('TTS latency exceeded target', {
          latencyMs,
          target: 500,
        });
      }

      let chunkCount = 0;

      // Stream audio chunks
      for await (const chunk of response.data) {
        chunkCount++;
        yield chunk as Buffer;
      }

      logger.info('TTS streaming completed', {
        chunkCount,
        totalLatencyMs: Date.now() - startTime,
      });
    } catch (error) {
      logger.error('TTS generation failed', { error, text: text.substring(0, 100) });
      throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate complete audio file (non-streaming)
   *
   * @param text - Text to convert to speech
   * @param options - Voice and language options
   * @returns Complete audio buffer
   */
  async generateAudioFile(text: string, options: TTSOptions): Promise<Buffer> {
    const chunks: Buffer[] = [];

    for await (const chunk of this.generateSpeech(text, options)) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Get API key from Google Cloud Secret Manager
   */
  private async getAPIKey(): Promise<string> {
    const client = new SecretManagerServiceClient();
    const projectId = this.config.gcpProjectId;
    const secretName = 'olorin-elevenlabs-api-key';

    const [version] = await client.accessSecretVersion({
      name: `projects/${projectId}/secrets/${secretName}/versions/latest`,
    });

    const apiKey = version.payload?.data?.toString();

    if (!apiKey) {
      throw new Error('Failed to retrieve Olorin TTS API key from Secret Manager');
    }

    return apiKey;
  }
}

/**
 * Olorin STT Service Integration
 *
 * Connects to israeli-radio ElevenLabs speech-to-text service
 * Provides audio transcription with language detection
 */
export class OlorinSTTService {
  private apiClient: AxiosInstance;
  private config: ReturnType<typeof getConfig>;

  constructor() {
    this.config = getConfig();
    this.apiClient = axios.create({
      baseURL: this.config.olorinSTTBaseURL,
      timeout: this.config.sttTimeout,
      httpAgent: new http.Agent({
        keepAlive: true,
        maxSockets: 50,
        keepAliveMsecs: 60000,
      }),
      httpsAgent: new https.Agent({
        keepAlive: true,
        maxSockets: 50,
        keepAliveMsecs: 60000,
      }),
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Transcribe audio to text using Olorin STT (israeli-radio)
   *
   * @param audioBuffer - Audio file buffer
   * @param options - Language and format options
   * @returns Transcription result with detected language
   */
  async transcribeAudio(audioBuffer: Buffer, options: STTOptions): Promise<{
    transcript: string;
    language: string;
    confidence: number;
    duration: number;
  }> {
    const startTime = Date.now();

    try {
      // Validate audio size
      if (audioBuffer.length > this.config.maxAudioSize) {
        throw new Error(`Audio exceeds maximum size of ${this.config.maxAudioSize} bytes`);
      }

      // Get API key from Secret Manager
      const apiKey = await this.getAPIKey();

      // Create form data
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: 'audio.mp3',
        contentType: 'audio/mpeg',
      });
      formData.append('language', options.language || 'auto');

      // Request transcription from Olorin service
      const response = await this.apiClient.post('/api/stt/transcribe', formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const latencyMs = Date.now() - startTime;

      logger.info('STT transcription completed', {
        latencyMs,
        audioSize: audioBuffer.length,
        language: response.data.language,
        transcriptLength: response.data.transcript.length,
      });

      return {
        transcript: response.data.transcript,
        language: response.data.language,
        confidence: response.data.confidence || 0.95,
        duration: latencyMs,
      };
    } catch (error) {
      logger.error('STT transcription failed', {
        error,
        audioSize: audioBuffer.length,
      });
      throw new Error(`STT transcription failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get API key from Google Cloud Secret Manager
   */
  private async getAPIKey(): Promise<string> {
    const client = new SecretManagerServiceClient();
    const projectId = this.config.gcpProjectId;
    const secretName = 'olorin-elevenlabs-api-key';

    const [version] = await client.accessSecretVersion({
      name: `projects/${projectId}/secrets/${secretName}/versions/latest`,
    });

    const apiKey = version.payload?.data?.toString();

    if (!apiKey) {
      throw new Error('Failed to retrieve Olorin STT API key from Secret Manager');
    }

    return apiKey;
  }
}

/**
 * Unified Olorin Audio Service
 *
 * Provides both TTS and STT capabilities through Olorin ecosystem
 */
export class OlorinAudioService {
  private ttsService: OlorinTTSService;
  private sttService: OlorinSTTService;

  constructor() {
    this.ttsService = new OlorinTTSService();
    this.sttService = new OlorinSTTService();
  }

  /**
   * Generate speech from text (streaming)
   */
  async *generateSpeechStream(text: string, options: TTSOptions): AsyncGenerator<Buffer> {
    yield* this.ttsService.generateSpeech(text, options);
  }

  /**
   * Generate complete audio file
   */
  async generateAudioFile(text: string, options: TTSOptions): Promise<Buffer> {
    return this.ttsService.generateAudioFile(text, options);
  }

  /**
   * Transcribe audio to text
   */
  async transcribeAudio(audioBuffer: Buffer, options: STTOptions): Promise<{
    transcript: string;
    language: string;
    confidence: number;
    duration: number;
  }> {
    return this.sttService.transcribeAudio(audioBuffer, options);
  }

  /**
   * Health check for TTS service
   */
  async healthCheckTTS(): Promise<boolean> {
    try {
      const testAudio = await this.ttsService.generateAudioFile('test', {
        voice: 'Rachel',
        language: 'en',
      });
      return testAudio.length > 0;
    } catch (error) {
      logger.error('TTS health check failed', { error });
      return false;
    }
  }

  /**
   * Health check for STT service
   */
  async healthCheckSTT(): Promise<boolean> {
    try {
      // Create minimal valid MP3 buffer for testing
      const testBuffer = Buffer.from([255, 251, 144, 0]); // MP3 header
      const result = await this.sttService.transcribeAudio(testBuffer, {
        language: 'en',
      });
      return result.transcript !== undefined;
    } catch (error) {
      logger.error('STT health check failed', { error });
      return false;
    }
  }
}
