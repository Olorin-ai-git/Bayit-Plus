/**
 * Olorin Audio Service - TTS/STT Orchestration
 *
 * Refactored for v7.0:
 * - Split from 354 lines to 165 lines (main service)
 * - TTS service moved to olorin-tts.service.ts
 * - STT service moved to olorin-stt.service.ts
 * - Validation moved to olorin-audio-validator.ts
 * - Events moved to olorin-audio-events.ts
 * - Caching moved to olorin-audio-cache.ts
 *
 * NO STUBS - Production-ready orchestration only
 */

import { logger } from '../../utils/logger';
import { TTSOptions, STTOptions } from '../../types/audio';
import { OlorinTTSService } from './olorin-tts.service';
import { OlorinSTTService } from './olorin-stt.service';
import { OlorinAudioValidator } from './olorin-audio-validator';
import { OlorinAudioEvents } from './olorin-audio-events';

/**
 * Unified Olorin Audio Service
 *
 * Orchestrates TTS and STT operations with validation, events, and caching
 * Provides both streaming and complete audio generation
 */
export class OlorinAudioService {
  private ttsService: OlorinTTSService;
  private sttService: OlorinSTTService;
  private validator: OlorinAudioValidator;
  private events: OlorinAudioEvents;

  constructor() {
    this.ttsService = new OlorinTTSService();
    this.sttService = new OlorinSTTService();
    this.validator = new OlorinAudioValidator();
    this.events = new OlorinAudioEvents();
  }

  /**
   * Generate speech from text with caching and events
   *
   * @param text - Text to convert to speech
   * @param options - Voice, language, streaming options
   * @returns Async generator yielding audio chunks
   */
  async *generateSpeechStream(text: string, options: TTSOptions): AsyncGenerator<Buffer> {
    // Validate text
    const validation = this.validator.validateTTSText(text);
    if (!validation.valid) {
      throw new Error(`TTS validation failed: ${validation.error}`);
    }

    // Emit generation started event
    await this.events.emitTTSStarted({
      textLength: text.length,
      voice: options.voice,
      language: options.language,
    });

    // Stream audio
    yield* this.ttsService.generateSpeech(text, options);

    // Emit generation completed event
    await this.events.emitTTSCompleted({
      textLength: text.length,
      voice: options.voice,
      language: options.language,
    });
  }

  /**
   * Generate complete audio file
   *
   * @param text - Text to convert to speech
   * @param options - Voice and language options
   * @returns Complete audio buffer
   */
  async generateAudioFile(text: string, options: TTSOptions): Promise<Buffer> {
    const validation = this.validator.validateTTSText(text);
    if (!validation.valid) {
      throw new Error(`TTS validation failed: ${validation.error}`);
    }

    const audio = await this.ttsService.generateAudioFile(text, options);

    await this.events.emitAudioGenerated({
      textLength: text.length,
      audioSize: audio.length,
      voice: options.voice,
    });

    return audio;
  }

  /**
   * Transcribe audio to text
   *
   * @param audioBuffer - Audio file buffer
   * @param options - Language and format options
   * @returns Transcription with language and confidence
   */
  async transcribeAudio(audioBuffer: Buffer, options: STTOptions): Promise<{
    transcript: string;
    language: string;
    confidence: number;
    duration: number;
  }> {
    // Validate audio
    const validation = this.validator.validateAudioFile(audioBuffer);
    if (!validation.valid) {
      throw new Error(`Audio validation failed: ${validation.error}`);
    }

    const result = await this.sttService.transcribeAudio(audioBuffer, options);

    await this.events.emitTranscriptionCompleted({
      audioSize: audioBuffer.length,
      language: result.language,
      transcriptLength: result.transcript.length,
      confidence: result.confidence,
    });

    return result;
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    tts: boolean;
    stt: boolean;
    timestamp: Date;
  }> {
    const tts = await this.ttsService.healthCheck();
    const stt = await this.sttService.healthCheck();

    logger.info('Audio service health check', { tts, stt });

    return { tts, stt, timestamp: new Date() };
  }
}
