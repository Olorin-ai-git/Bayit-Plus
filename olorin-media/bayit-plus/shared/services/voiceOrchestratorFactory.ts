/**
 * Voice Orchestrator Factory
 * Factory function and default configuration for creating OlorinVoiceOrchestrator instances
 */

import { VoiceConfig } from '../types/voiceAvatar';
import { OlorinVoiceOrchestrator } from './olorinVoiceOrchestrator';

/**
 * Default configuration for voice orchestrator
 * Can be overridden when creating instance
 */
export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  platform: 'web',
  language: 'he',
  wakeWordEnabled: false,
  streamingMode: false,
  initialAvatarMode: 'full',
  autoExpandOnWakeWord: true,
  collapseDelay: 10000,
};

/**
 * Create voice orchestrator instance with optional config overrides
 * @param config - Partial configuration to override defaults
 * @returns Configured OlorinVoiceOrchestrator instance
 */
export function createVoiceOrchestrator(config?: Partial<VoiceConfig>): OlorinVoiceOrchestrator {
  const mergedConfig: VoiceConfig = {
    ...DEFAULT_VOICE_CONFIG,
    ...config,
  };

  return new OlorinVoiceOrchestrator(mergedConfig);
}

export default createVoiceOrchestrator;
