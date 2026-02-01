/**
 * Avatar Interruption Service
 *
 * Handles interruption detection and graceful recovery
 * - Stop command detection
 * - Content freeze
 * - Recovery dialogue
 */

import { getRandomDialogue, DialogueLine } from '../constants/avatarDialogues';
import { isInterruption, AvatarCoreState, STATE_TIMING } from '../constants/avatarStates';

export interface InterruptionEvent {
  type: 'stop' | 'new_command' | 'timeout';
  transcript?: string;
  timestamp: number;
}

export interface InterruptionState {
  isInterrupted: boolean;
  interruptionType: 'stop' | 'new_command' | 'timeout' | null;
  frozenContent: unknown | null;
  recoveryDialogue: DialogueLine | null;
  pendingCommand: string | null;
}

export interface InterruptionCallbacks {
  onInterrupt: (event: InterruptionEvent) => void;
  onResume: () => void;
  onFreeze: () => void;
  onClearContent: () => void;
}

/**
 * Avatar Interruption Service
 */
class AvatarInterruptionServiceClass {
  private state: InterruptionState = {
    isInterrupted: false,
    interruptionType: null,
    frozenContent: null,
    recoveryDialogue: null,
    pendingCommand: null,
  };

  private callbacks: InterruptionCallbacks | null = null;
  private ttsAbortController: AbortController | null = null;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Initialize callbacks
   */
  setCallbacks(callbacks: InterruptionCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Check transcript for interruption signals
   */
  checkForInterruption(
    transcript: string,
    currentState: AvatarCoreState
  ): InterruptionEvent | null {
    const { isStop, isNewCommand } = isInterruption(transcript);

    if (isStop) {
      return {
        type: 'stop',
        transcript,
        timestamp: Date.now(),
      };
    }

    if (isNewCommand && currentState === 'responding') {
      return {
        type: 'new_command',
        transcript,
        timestamp: Date.now(),
      };
    }

    return null;
  }

  /**
   * Handle interruption event
   */
  async handleInterruption(event: InterruptionEvent): Promise<DialogueLine> {
    // Abort any ongoing TTS
    this.abortTTS();

    // Update state
    this.state.isInterrupted = true;
    this.state.interruptionType = event.type;

    // Get recovery dialogue
    const dialogue = getRandomDialogue('interruption');
    this.state.recoveryDialogue = dialogue;

    // Store pending command if it's a new command interruption
    if (event.type === 'new_command' && event.transcript) {
      this.state.pendingCommand = this.extractNewCommand(event.transcript);
    }

    // Notify callbacks
    this.callbacks?.onInterrupt(event);
    this.callbacks?.onFreeze();

    // Set up auto-resume
    this.scheduleResume();

    return dialogue;
  }

  /**
   * Abort TTS playback
   */
  abortTTS(): void {
    if (this.ttsAbortController) {
      this.ttsAbortController.abort();
      this.ttsAbortController = null;
    }
  }

  /**
   * Set TTS abort controller
   */
  setTTSAbortController(controller: AbortController): void {
    this.ttsAbortController = controller;
  }

  /**
   * Extract new command from interruption transcript
   */
  private extractNewCommand(transcript: string): string {
    const patterns = [
      /actually\s+(.+)/i,
      /instead\s+(.+)/i,
      /no,?\s+(.+)/i,
      /wait,?\s+(.+)/i,
      /בעצם\s+(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return transcript;
  }

  /**
   * Schedule auto-resume to listening state
   */
  private scheduleResume(): void {
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
    }

    this.resumeTimer = setTimeout(() => {
      this.resume();
    }, STATE_TIMING.interruptedDisplayTime);
  }

  /**
   * Resume from interruption
   */
  resume(): void {
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }

    const hadPendingCommand = this.state.pendingCommand;

    // Clear state
    this.state.isInterrupted = false;
    this.state.interruptionType = null;
    this.state.recoveryDialogue = null;

    // Notify callbacks
    this.callbacks?.onResume();

    // If there was a pending command, it should be processed
    // The caller can check getPendingCommand() and handle it
  }

  /**
   * Get pending command (if any)
   */
  getPendingCommand(): string | null {
    const command = this.state.pendingCommand;
    this.state.pendingCommand = null;
    return command;
  }

  /**
   * Freeze content in place
   */
  freezeContent(content: unknown): void {
    this.state.frozenContent = content;
  }

  /**
   * Get frozen content
   */
  getFrozenContent(): unknown | null {
    return this.state.frozenContent;
  }

  /**
   * Clear frozen content
   */
  clearFrozenContent(): void {
    this.state.frozenContent = null;
    this.callbacks?.onClearContent();
  }

  /**
   * Check if currently interrupted
   */
  isInterrupted(): boolean {
    return this.state.isInterrupted;
  }

  /**
   * Get current state
   */
  getState(): InterruptionState {
    return { ...this.state };
  }

  /**
   * Reset service
   */
  reset(): void {
    this.abortTTS();

    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }

    this.state = {
      isInterrupted: false,
      interruptionType: null,
      frozenContent: null,
      recoveryDialogue: null,
      pendingCommand: null,
    };
  }
}

// Export singleton
export const AvatarInterruptionService = new AvatarInterruptionServiceClass();

/**
 * Hook for React components
 */
export function useAvatarInterruption() {
  return {
    checkForInterruption: AvatarInterruptionService.checkForInterruption.bind(
      AvatarInterruptionService
    ),
    handleInterruption: AvatarInterruptionService.handleInterruption.bind(
      AvatarInterruptionService
    ),
    isInterrupted: AvatarInterruptionService.isInterrupted.bind(AvatarInterruptionService),
    getPendingCommand: AvatarInterruptionService.getPendingCommand.bind(
      AvatarInterruptionService
    ),
    resume: AvatarInterruptionService.resume.bind(AvatarInterruptionService),
    reset: AvatarInterruptionService.reset.bind(AvatarInterruptionService),
    setCallbacks: AvatarInterruptionService.setCallbacks.bind(AvatarInterruptionService),
    setTTSAbortController: AvatarInterruptionService.setTTSAbortController.bind(
      AvatarInterruptionService
    ),
    abortTTS: AvatarInterruptionService.abortTTS.bind(AvatarInterruptionService),
  };
}
