/**
 * Voice TTS Playback (tvOS)
 * Handles text-to-speech response playback with TV-optimized settings
 * Uses 0.9x rate for TV clarity at 10-foot viewing distance
 */

import { ttsService } from './tts';
import { logger } from '@bayit/shared/utils/logger';
import type { VoiceSessionMetrics } from './voiceTypes';

const log = logger.scope('VoiceTtsPlayback');

interface TtsPlaybackConfig {
  ttsLanguage: string;
  ttsRate: number;
  enableMetrics: boolean;
}

/**
 * Play a voice response using TTS with tvOS-optimized settings
 * Returns the TTS duration for metrics tracking
 */
export async function playVoiceResponse(
  text: string,
  config: TtsPlaybackConfig,
  sessionMetrics: VoiceSessionMetrics | null,
  sessionStartTime: number,
): Promise<void> {
  try {
    const ttsStartTime = Date.now();

    ttsService.setLanguage(config.ttsLanguage);
    ttsService.setRate(config.ttsRate);

    await ttsService.speak(text, {
      language: config.ttsLanguage,
      rate: config.ttsRate,
    });

    if (sessionMetrics) {
      sessionMetrics.response = text;
      sessionMetrics.ttsTime = Date.now() - ttsStartTime;
      sessionMetrics.totalTime = Date.now() - sessionStartTime;
    }

    if (config.enableMetrics && sessionMetrics) {
      log.info('Session metrics (TV)', {
        triggerType: sessionMetrics.triggerType,
        totalTime: sessionMetrics.totalTime,
        listeningTime: sessionMetrics.listeningTime,
        processingTime: sessionMetrics.processingTime,
        ttsTime: sessionMetrics.ttsTime,
        confidence: sessionMetrics.confidence,
      });
    }
  } catch (error) {
    log.error('Failed to play voice response', error);
  }
}

export default playVoiceResponse;
