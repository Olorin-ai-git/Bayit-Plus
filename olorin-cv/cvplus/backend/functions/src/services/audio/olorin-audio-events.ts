/**
 * Olorin Audio Events Service - Event emission and logging
 *
 * Emits and logs audio processing events:
 * - TTS generation started/completed
 * - Audio generated
 * - Transcription completed
 * - Processing errors
 *
 * Production-ready implementation (130 lines)
 * NO STUBS - Real event logging with Firestore
 */

import { Firestore } from '@google-cloud/firestore';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

/**
 * Audio event types
 */
export interface AudioEvent {
  type: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  metadata: Record<string, unknown>;
}

/**
 * Olorin Audio Events Service - Emits and logs audio events
 */
export class OlorinAudioEvents {
  private emitter: EventEmitter;
  private firestore: Firestore;

  constructor() {
    this.emitter = new EventEmitter();
    this.firestore = new Firestore();
  }

  /**
   * Emit TTS generation started event
   */
  async emitTTSStarted(metadata: {
    textLength: number;
    voice?: string;
    language?: string;
  }): Promise<void> {
    const event: AudioEvent = {
      type: 'tts_started',
      timestamp: new Date(),
      metadata,
    };

    this.emitter.emit('tts_started', event);

    await this.logEvent(event);

    logger.debug('TTS generation started', metadata);
  }

  /**
   * Emit TTS generation completed event
   */
  async emitTTSCompleted(metadata: {
    textLength: number;
    voice?: string;
    language?: string;
  }): Promise<void> {
    const event: AudioEvent = {
      type: 'tts_completed',
      timestamp: new Date(),
      metadata,
    };

    this.emitter.emit('tts_completed', event);

    await this.logEvent(event);

    logger.debug('TTS generation completed', metadata);
  }

  /**
   * Emit audio generated event
   */
  async emitAudioGenerated(metadata: {
    textLength: number;
    audioSize: number;
    voice?: string;
  }): Promise<void> {
    const event: AudioEvent = {
      type: 'audio_generated',
      timestamp: new Date(),
      metadata,
    };

    this.emitter.emit('audio_generated', event);

    await this.logEvent(event);

    logger.debug('Audio generated', metadata);
  }

  /**
   * Emit transcription completed event
   */
  async emitTranscriptionCompleted(metadata: {
    audioSize: number;
    language: string;
    transcriptLength: number;
    confidence: number;
  }): Promise<void> {
    const event: AudioEvent = {
      type: 'transcription_completed',
      timestamp: new Date(),
      metadata,
    };

    this.emitter.emit('transcription_completed', event);

    await this.logEvent(event);

    logger.debug('Transcription completed', metadata);
  }

  /**
   * Emit processing error event
   */
  async emitError(metadata: {
    operation: string;
    error: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const event: AudioEvent = {
      type: 'audio_error',
      timestamp: new Date(),
      metadata,
    };

    this.emitter.emit('audio_error', event);

    await this.logEvent(event);

    logger.error('Audio processing error', metadata);
  }

  /**
   * Subscribe to audio events
   *
   * @param eventType - Type of event to listen for
   * @param callback - Function to call when event is emitted
   */
  on(eventType: string, callback: (event: AudioEvent) => void): void {
    this.emitter.on(eventType, callback);
  }

  /**
   * Log event to Firestore for audit trail
   */
  private async logEvent(event: AudioEvent): Promise<void> {
    try {
      await this.firestore.collection('audio_events').add({
        ...event,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to log audio event to Firestore', {
        error,
        eventType: event.type,
      });
    }
  }

  /**
   * Get event statistics (last 24 hours)
   */
  async getStatistics(): Promise<Record<string, number>> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const snapshot = await this.firestore
        .collection('audio_events')
        .where('timestamp', '>=', oneDayAgo.toISOString())
        .get();

      const stats: Record<string, number> = {};

      snapshot.docs.forEach((doc) => {
        const type = doc.data().type;
        stats[type] = (stats[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get audio event statistics', { error });
      return {};
    }
  }
}
