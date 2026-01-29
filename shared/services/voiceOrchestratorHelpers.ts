/**
 * Voice Orchestrator Helper Functions
 * Utility functions for voice orchestrator state management
 */

import { useSupportStore } from '../stores/supportStore';
import { VoiceIntent, VoiceCommand } from '../types/voiceAvatar';

/**
 * Update wizard gesture based on voice intent type
 * Provides visual feedback during voice processing
 */
export function updateGestureForIntent(intent: VoiceIntent): void {
  const store = useSupportStore.getState();

  switch (intent) {
    case 'SEARCH':
      store.setGestureState('browsing');
      break;
    case 'CHAT':
      store.setGestureState('conjuring');
      break;
    case 'NAVIGATION':
    case 'PLAYBACK':
    case 'SCROLL':
    case 'CONTROL':
      store.setGestureState('greeting');
      break;
    default:
      store.setGestureState('idle');
  }
}

/**
 * Generate unique command ID
 */
export function generateCommandId(): string {
  return `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create voice command record for history
 */
export function createCommandRecord(
  transcript: string,
  intent: VoiceIntent,
  confidence: number,
  actionType: string
): VoiceCommand {
  return {
    id: generateCommandId(),
    transcript,
    intent,
    confidence,
    timestamp: new Date().toISOString(),
    executedAction: actionType,
  };
}
