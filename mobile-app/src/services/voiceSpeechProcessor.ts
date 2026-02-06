/**
 * Voice Speech Result Processor (Mobile)
 * Processes speech recognition results through orchestrator or backend proxy
 * Handles API routing, metrics tracking, and response handling
 */

import { speechService } from './speech';
import { backendProxyService } from './backendProxyService';
import { OlorinVoiceOrchestrator } from '@bayit/shared/services/olorinVoiceOrchestrator';
import logger from '@/utils/logger';
import { playVoiceResponse } from './voiceTtsPlayback';
import type { VoiceSessionMetrics, VoiceManagerConfig } from './voiceTypes';

const moduleLogger = logger.scope('VoiceSpeechProcessor');

interface ProcessSpeechOptions {
  result: { transcription: string; confidence: number; isFinal: boolean };
  orchestrator: OlorinVoiceOrchestrator | null;
  config: Required<VoiceManagerConfig>;
  sessionMetrics: VoiceSessionMetrics | null;
  sessionStartTime: number;
}

interface ProcessSpeechResult {
  success: boolean;
  errorMessage?: string;
}

export async function processSpeechResult(options: ProcessSpeechOptions): Promise<ProcessSpeechResult> {
  const { result, orchestrator, config, sessionMetrics, sessionStartTime } = options;

  await speechService.stopRecognition();

  if (sessionMetrics) {
    sessionMetrics.transcription = result.transcription;
    sessionMetrics.confidence = result.confidence;
    sessionMetrics.listeningTime = Date.now() - sessionStartTime - (sessionMetrics.wakeWordTime || 0);
  }

  const processingStart = Date.now();
  try {
    let response: { responseText?: string; intent?: string; confidence?: number };

    if (orchestrator) {
      const r = await orchestrator.processTranscript(result.transcription, undefined);
      response = { responseText: r.spokenResponse, intent: r.intent, confidence: r.confidence };
      moduleLogger.debug('Orchestrator response', { intent: response.intent, confidence: response.confidence });
    } else {
      moduleLogger.warn('Orchestrator not available, using legacy proxy');
      response = await backendProxyService.processVoiceCommand({
        transcription: result.transcription,
        confidence: result.confidence,
        language: config.speechLanguage,
      });
    }

    if (sessionMetrics) sessionMetrics.processingTime = Date.now() - processingStart;

    if (response.responseText) {
      await playVoiceResponse(response.responseText, config, sessionMetrics, sessionStartTime);
    }

    return { success: true };
  } catch (error) {
    moduleLogger.error('API processing failed', error);
    return { success: false, errorMessage: (error as Error).message };
  }
}
