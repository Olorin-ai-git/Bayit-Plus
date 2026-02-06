/**
 * Voice Orchestrator Factory
 * Returns the singleton orchestrator instance.
 * For backwards compatibility with components using createVoiceOrchestrator().
 */

import { VoiceConfig } from '../types/voiceAvatar';
import { OlorinVoiceOrchestrator, voiceOrchestrator, DEFAULT_VOICE_CONFIG } from './olorinVoiceOrchestrator';

// Re-export for consumers that imported from here
export { DEFAULT_VOICE_CONFIG };

/**
 * Get the singleton voice orchestrator instance.
 * Config overrides are applied via initialize() after creation.
 * @param _config - Ignored, kept for API compatibility. Use orchestrator.initialize(config) instead.
 * @returns The singleton OlorinVoiceOrchestrator instance
 */
export function createVoiceOrchestrator(_config?: Partial<VoiceConfig>): OlorinVoiceOrchestrator {
  return voiceOrchestrator;
}

export default createVoiceOrchestrator;
