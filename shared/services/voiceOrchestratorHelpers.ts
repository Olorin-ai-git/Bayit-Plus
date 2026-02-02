/**
 * Voice Orchestrator Helper Functions
 * Utility functions for voice orchestrator state management and animation mapping
 */

import { useSupportStore } from '../stores/supportStore';
import { VoiceIntent, VoiceCommand } from '../types/voiceAvatar';
import { AnimationSequence } from '../remotion/utils/sequencing';

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

// ===== REMOTION ANIMATION MAPPING =====

/**
 * Result context for animation selection
 */
export interface ResultContext {
  /** Number of results returned */
  count: number;
  /** Type of content returned */
  contentType?: 'live' | 'movie' | 'series' | 'radio' | 'podcast' | 'audiobook';
  /** Whether this was a successful operation */
  success: boolean;
  /** Error type if operation failed */
  errorType?: 'not_found' | 'network' | 'permission' | 'unknown';
}

/**
 * Get animation sequence for voice intent and result context
 * Maps user interactions to appropriate multi-gesture animation flows
 *
 * @param intent - Voice intent type (SEARCH, CHAT, PLAYBACK, etc.)
 * @param context - Result context (count, content type, success)
 * @returns Animation sequence ID
 *
 * @example
 * ```typescript
 * // Search with no results
 * const seq = getAnimationSequenceForIntent('SEARCH', { count: 0, success: false });
 * // Returns: 'error_shake'
 *
 * // Search with single result
 * const seq = getAnimationSequenceForIntent('SEARCH', { count: 1, success: true });
 * // Returns: 'magical_reveal'
 *
 * // Search with multiple results
 * const seq = getAnimationSequenceForIntent('SEARCH', { count: 5, success: true });
 * // Returns: 'process_command'
 * ```
 */
export function getAnimationSequenceForIntent(
  intent: VoiceIntent,
  context: ResultContext
): AnimationSequence {
  switch (intent) {
    case 'SEARCH':
      // No results → error shake
      if (context.count === 0 || !context.success) {
        return 'error_shake';
      }
      // Single result → magical reveal
      if (context.count === 1) {
        return 'magical_reveal';
      }
      // Multiple results → standard processing
      return 'process_command';

    case 'CHAT':
      // Chat always uses standard processing flow
      return 'process_command';

    case 'PLAYBACK':
      // Playback commands → success celebration
      return 'success';

    case 'NAVIGATION':
      // Navigation commands → acknowledge
      return 'acknowledge_new';

    case 'HELP':
      // Help requests → standard processing
      return 'process_command';

    case 'FILTER':
      // Filter operations → acknowledge
      return 'acknowledge_new';

    case 'SETTINGS':
      // Settings changes → acknowledge
      return 'acknowledge_new';

    default:
      // Unknown intent → standard processing
      return 'process_command';
  }
}

/**
 * Get wake-up animation sequence
 * Used when wizard appears for the first time or after being dismissed
 *
 * @returns Animation sequence ID for summoning wizard
 */
export function getWakeUpSequence(): AnimationSequence {
  return 'summon_wizard';
}

/**
 * Get dismissal animation sequence
 * Used when wizard is being dismissed or user closes voice modal
 *
 * @returns Animation sequence ID for dismissing wizard
 */
export function getDismissSequence(): AnimationSequence {
  return 'dismiss_wizard';
}

/**
 * Get error animation sequence based on error type
 * Provides context-specific error animations
 *
 * @param errorType - Type of error that occurred
 * @returns Animation sequence ID for error state
 */
export function getErrorSequence(errorType: ResultContext['errorType']): AnimationSequence {
  switch (errorType) {
    case 'not_found':
      // Content not found → confused + shrugging
      return 'error_shake';

    case 'network':
      // Network error → confused + shrugging
      return 'error_shake';

    case 'permission':
      // Permission denied → confused + shrugging
      return 'error_shake';

    case 'unknown':
    default:
      // Unknown error → confused + shrugging
      return 'error_shake';
  }
}

/**
 * Determine if animation should auto-dismiss after completion
 * Some sequences naturally lead to dismissal, others continue interaction
 *
 * @param sequence - Animation sequence ID
 * @returns Whether wizard should auto-dismiss after this sequence
 */
export function shouldAutoDismissAfterSequence(sequence: AnimationSequence): boolean {
  switch (sequence) {
    case 'dismiss_wizard':
      // Obviously auto-dismiss
      return true;

    case 'error_shake':
      // Keep wizard visible after error for clarification
      return false;

    case 'success':
      // Keep wizard visible after success for potential follow-up
      return false;

    case 'summon_wizard':
    case 'process_command':
    case 'magical_reveal':
    case 'acknowledge_new':
    default:
      // Keep wizard visible for continued interaction
      return false;
  }
}

/**
 * Get transition delay between sequences
 * Some sequences need breathing room before next animation
 *
 * @param fromSequence - Previous animation sequence
 * @param toSequence - Next animation sequence
 * @returns Delay in milliseconds before starting next sequence
 */
export function getSequenceTransitionDelay(
  fromSequence: AnimationSequence | null,
  toSequence: AnimationSequence
): number {
  // First animation (wizard appearing)
  if (fromSequence === null && toSequence === 'summon_wizard') {
    return 0; // Immediate
  }

  // Error recovery (wait for user to read error)
  if (fromSequence === 'error_shake') {
    return 1000; // 1 second
  }

  // Success celebration (let confetti settle)
  if (fromSequence === 'success') {
    return 500; // 0.5 seconds
  }

  // Standard transition
  return 300; // 0.3 seconds
}
