/**
 * Voice Wake Word Handler (tvOS)
 * Handles wake word detection events and transitions to speech recognition
 * Manages background listening lifecycle (start/stop/resume)
 */

import { speechService } from './speech';
import { wakeWordService } from './wakeWord';
import { OlorinVoiceOrchestrator } from '@bayit/shared/services/olorinVoiceOrchestrator';
import { useSupportStore } from '@bayit/shared/stores/supportStore';
import { logger } from '@bayit/shared/utils/logger';
import type { VoiceSessionMetrics, VoiceManagerConfig } from './voiceTypes';

const log = logger.scope('VoiceWakeWordHandler');

interface WakeWordHandlerDeps {
  getConfig: () => Required<VoiceManagerConfig>;
  getOrchestrator: () => OlorinVoiceOrchestrator | null;
  getSessionMetrics: () => VoiceSessionMetrics | null;
  getSessionStartTime: () => number;
  setStage: (stage: string, errorMessage?: string) => void;
  startSession: (triggerType: 'menu-button' | 'wake-word') => void;
  setListenTimeout: (handle: NodeJS.Timeout) => void;
  clearTimeout: () => void;
  setWakeWordListening: (value: boolean) => void;
  isWakeWordListening: () => boolean;
}

export async function handleWakeWordDetected(
  detection: any,
  deps: WakeWordHandlerDeps,
): Promise<void> {
  const config = deps.getConfig();
  try {
    await stopBackgroundListening(deps);
    const orchestrator = deps.getOrchestrator();
    if (orchestrator) await orchestrator.startVoiceInteraction('wake-word');
    useSupportStore.getState().onWakeWordDetected();
    deps.startSession('wake-word');
    const metrics = deps.getSessionMetrics();
    if (config.enableMetrics && metrics)
      metrics.triggerTime = Date.now() - deps.getSessionStartTime();
    deps.setStage('detected');
    await new Promise(resolve => setTimeout(resolve, 300));
    deps.setStage('listening');
    await speechService.setLanguage(config.speechLanguage);
    await speechService.startRecognition();
    const handle = setTimeout(async () => {
      log.warn('Speech timeout after wake word');
      await speechService.stopRecognition();
      deps.setStage('timeout');
      await startBackgroundListening(deps);
    }, config.listenTimeoutMs);
    deps.setListenTimeout(handle);
  } catch (error) {
    log.error('Failed to handle wake word', error);
    deps.setStage('error', (error as Error).message);
    await startBackgroundListening(deps).catch((e) => log.error('Background op failed', e));
  }
}

export async function startBackgroundListening(deps: WakeWordHandlerDeps): Promise<void> {
  if (deps.isWakeWordListening()) return;
  const config = deps.getConfig();
  try {
    log.info('Starting background wake word detection');
    await wakeWordService.setLanguage(config.wakeWordLanguage);
    await wakeWordService.startListening();
    deps.setWakeWordListening(true);
    deps.setStage('wake-word');
    if (config.wakeWordTimeoutMs > 0) {
      const handle = setTimeout(async () => {
        log.warn('Wake word timeout');
        await stopBackgroundListening(deps);
        deps.setStage('timeout');
      }, config.wakeWordTimeoutMs);
      deps.setListenTimeout(handle);
    }
  } catch (error) {
    log.error('Failed to start background listening', error);
    deps.setStage('error', (error as Error).message);
    throw error;
  }
}

export async function stopBackgroundListening(deps: WakeWordHandlerDeps): Promise<void> {
  if (!deps.isWakeWordListening()) return;
  try {
    await wakeWordService.stopListening();
    deps.setWakeWordListening(false);
    deps.clearTimeout();
    deps.setStage('idle');
  } catch (error) {
    log.error('Failed to stop background listening', error);
    throw error;
  }
}

export function shouldResumeBackgroundListening(config: Required<VoiceManagerConfig>): boolean {
  return config.enableBackgroundListening && config.triggerType !== 'menu-button';
}
