/**
 * Voice TTS Playback (Mobile)
 * Handles text-to-speech response playback for mobile devices
 */

import { ttsService } from './tts';
import logger from '@/utils/logger';
import type { VoiceSessionMetrics } from './voiceTypes';

const moduleLogger = logger.scope('VoiceTtsPlayback');

interface TtsPlaybackConfig {
  ttsLanguage: string;
  ttsRate: number;
  enableMetrics: boolean;
}

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
      moduleLogger.info('Session metrics (mobile)', {
        totalDuration: sessionMetrics.totalTime,
        listenDuration: sessionMetrics.listeningTime,
        processingDuration: sessionMetrics.processingTime,
        avgConfidence: sessionMetrics.confidence,
      });
    }
  } catch (error) {
    moduleLogger.error('Failed to play voice response', error);
  }
}
