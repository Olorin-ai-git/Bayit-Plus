/**
 * Olorin Voice Orchestrator
 * Single command center for all voice interactions across platforms.
 * Owns stream lifecycle, routes LLM chunks to store, commands animations,
 * controls timing, manages state machine, and handles error recovery.
 */

import { EventEmitter } from 'eventemitter3';
import i18n from '../i18n';
import { useSupportStore, VoiceState } from '../stores/supportStore';
import { streamingVoicePipeline } from './streamingVoicePipeline';
import { voiceCommandProcessor, VoiceCommandResponse } from './voiceCommandProcessor';
import { VoiceConfig, VoiceTrigger, AvatarMode, VoiceIntent } from '../types/voiceAvatar';
import { logger } from '../utils/logger';
import {
  updateGestureForIntent,
  createCommandRecord,
  getWakeUpSequence,
  getDismissSequence,
  getAnimationSequenceForIntent,
  getErrorSequence,
  ResultContext,
} from './voiceOrchestratorHelpers';
import { supportConfig } from '../config/supportConfig';
import { containsStopKeyword } from './voiceStopKeywords';

const orchestratorLogger = logger.scope('OlorinVoiceOrchestrator');

/** Valid state transitions for the voice state machine */
const VALID_TRANSITIONS: Record<VoiceState, VoiceState[]> = {
  idle: ['listening', 'speaking', 'error'],
  listening: ['processing', 'idle', 'error'],
  processing: ['speaking', 'error', 'idle'],
  speaking: ['listening', 'idle', 'error'],
  error: ['idle'],
};

/** Typed events emitted by the orchestrator */
export interface OrchestratorEvents {
  stateChange: (event: { from: VoiceState; to: VoiceState }) => void;
  animationTrigger: (sequenceId: string) => void;
  streamingText: (event: { text: string; isFinal: boolean }) => void;
  error: (event: { error: string; recoverable: boolean }) => void;
}

/** Default configuration for voice orchestrator */
export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  platform: 'web',
  language: i18n.language || 'en',
  wakeWordEnabled: false,
  streamingMode: false,
  initialAvatarMode: 'full',
  autoExpandOnWakeWord: true,
  collapseDelay: 10000,
};

export class OlorinVoiceOrchestrator extends EventEmitter<OrchestratorEvents> {
  private config: VoiceConfig;
  private isInitialized = false;
  private currentState: VoiceState = 'idle';
  private retryCount = 0;
  private continuationTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private pipelineActive = false;
  private shouldStopListening = false;

  private static readonly MAX_RETRIES = 3;

  constructor(config: VoiceConfig) {
    super();
    this.config = config;
  }

  /** Initialize orchestrator with optional config overrides */
  async initialize(config?: Partial<VoiceConfig>): Promise<void> {
    if (this.isInitialized) return;
    if (config) {
      this.config = { ...this.config, ...config };
    }
    if (this.config.wakeWordEnabled) {
      await this.initializeWakeWord();
    }
    // Prewarm streaming pipeline (non-blocking)
    streamingVoicePipeline.prewarm().catch(() => {});
    this.isInitialized = true;
    orchestratorLogger.info('Initialized', this.config);
  }

  /**
   * Validate and execute a state transition.
   * Rejects invalid transitions with error logging.
   */
  private transitionTo(newState: VoiceState): boolean {
    const valid = VALID_TRANSITIONS[this.currentState];
    if (!valid?.includes(newState)) {
      orchestratorLogger.warn('Invalid state transition rejected', {
        from: this.currentState,
        to: newState,
      });
      return false;
    }
    const prev = this.currentState;
    this.currentState = newState;
    useSupportStore.getState().setVoiceState(newState);
    this.emit('stateChange', { from: prev, to: newState });
    return true;
  }

  /**
   * Force a state transition, bypassing validation.
   * Used for interrupt/endSession/error recovery where we must reach a known state
   * regardless of the current state machine position.
   */
  private forceTransitionTo(newState: VoiceState): void {
    const prev = this.currentState;
    if (prev === newState) return;
    this.currentState = newState;
    useSupportStore.getState().setVoiceState(newState);
    this.emit('stateChange', { from: prev, to: newState });
    orchestratorLogger.info('Forced state transition', { from: prev, to: newState });
  }

  /** Start voice interaction - orchestrator owns the pipeline */
  async startVoiceInteraction(trigger: VoiceTrigger = 'manual'): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Orchestrator not initialized. Call initialize() first.');
    }

    const store = useSupportStore.getState();

    // Auto-expand avatar if wake word triggered
    if (trigger === 'wake-word' && this.config.autoExpandOnWakeWord) {
      if (store.avatarVisibilityMode === 'icon_only' || store.avatarVisibilityMode === 'minimal') {
        store.setAvatarVisibilityMode('compact');
      }
    }

    // Open voice modal if not already open
    if (!store.isVoiceModalOpen) {
      store.openVoiceModal();
      this.triggerAnimation(getWakeUpSequence());
    }

    this.shouldStopListening = false;

    // Start streaming pipeline
    await this.startPipeline();
    orchestratorLogger.info('Started voice interaction', { trigger });
  }

  /** Start the streaming pipeline with orchestrator-owned callbacks */
  private async startPipeline(): Promise<void> {
    if (this.pipelineActive) return;

    try {
      this.pipelineActive = true;
      useSupportStore.getState().clearStreamingResponse();

      // Setup orchestrator-owned event handlers
      this.setupPipelineHandlers();

      // Always use current i18n language at interaction time (not stale config)
      const currentLanguage = i18n.language || this.config.language;
      streamingVoicePipeline.setConfig({ language: currentLanguage });
      const conversationId = streamingVoicePipeline.getConversationId();
      await streamingVoicePipeline.startInteraction(conversationId);
      this.retryCount = 0;
    } catch (error) {
      this.pipelineActive = false;
      await this.handlePipelineError(
        error instanceof Error ? error : new Error('Failed to start pipeline')
      );
    }
  }

  /** Setup event handlers on the pipeline - orchestrator routes all events */
  private setupPipelineHandlers(): void {
    // Remove previous listeners to avoid duplicates
    streamingVoicePipeline.removeAllListeners();

    streamingVoicePipeline.on('stateChange', (state) => {
      // Orchestrator is sole state authority - route pipeline state through forceTransitionTo
      // so events are emitted and store is updated from a single source
      this.forceTransitionTo(state);
    });

    streamingVoicePipeline.on('transcriptUpdate', (transcript, _language, isFinal) => {
      if (isFinal && containsStopKeyword(transcript)) {
        this.shouldStopListening = true;
      }
    });

    streamingVoicePipeline.on('intentAction', (intent, action, spokenResponse, confidence) => {
      const store = useSupportStore.getState();
      store.setInteractionType(intent as VoiceIntent);
      store.setIntentConfidence(confidence);
      store.setPendingVoiceAction(action);
      store.setLastResponse(spokenResponse);
      orchestratorLogger.info('Intent action received', { intent, actionType: action.type, confidence });
    });

    streamingVoicePipeline.on('responseComplete', (conversationId) => {
      this.handleResponseComplete(conversationId);
    });

    streamingVoicePipeline.on('error', (error) => {
      this.handlePipelineError(error);
    });
  }

  /** Handle completed response - trigger animations and continuation */
  private handleResponseComplete(conversationId: string): void {
    const store = useSupportStore.getState();
    const intent = store.currentInteractionType || 'CHAT';
    const resultContext = this.analyzeResultContext(store.lastResponse);

    // Trigger intent-based animation
    const sequence = getAnimationSequenceForIntent(intent, resultContext);
    this.triggerAnimation(sequence);

    this.emit('streamingText', { text: store.lastResponse, isFinal: true });

    // Handle continuation
    this.handleContinuation();
  }

  /** Handle continuation after response completes */
  private handleContinuation(): void {
    this.cancelPendingContinuation();

    const store = useSupportStore.getState();
    const shouldContinue = store.isVoiceModalOpen && !this.shouldStopListening;

    if (shouldContinue) {
      this.continuationTimeoutId = setTimeout(async () => {
        this.continuationTimeoutId = null;
        const currentStore = useSupportStore.getState();
        if (this.pipelineActive && currentStore.isVoiceModalOpen && !this.shouldStopListening) {
          try {
            await streamingVoicePipeline.restartListening();
          } catch (error) {
            orchestratorLogger.error('Failed to restart listening', { error });
          }
        }
      }, 500);
    } else {
      this.shouldStopListening = false;
    }
  }

  /** Stop listening - commit current audio */
  stopListening(): void {
    this.cancelPendingContinuation();
    if (this.pipelineActive) {
      streamingVoicePipeline.commit('button');
    }
    orchestratorLogger.info('Stopped listening');
  }

  /** Interrupt current voice interaction */
  interrupt(): void {
    this.cancelPendingContinuation();
    if (this.pipelineActive) {
      streamingVoicePipeline.cancel();
    }
    useSupportStore.getState().clearStreamingResponse();
    this.forceTransitionTo('idle');
    orchestratorLogger.info('Interrupted');
  }

  /** End voice session - stop everything and close modal */
  endSession(): void {
    this.cancelPendingContinuation();
    this.triggerAnimation(getDismissSequence());

    if (this.pipelineActive) {
      streamingVoicePipeline.stopInteraction();
      this.pipelineActive = false;
    }

    const store = useSupportStore.getState();
    store.clearStreamingResponse();
    store.closeVoiceModal();
    streamingVoicePipeline.resetConversation();
    this.forceTransitionTo('idle');
    this.shouldStopListening = false;
    orchestratorLogger.info('Session ended');
  }

  /** Error recovery with exponential backoff retry */
  private async handlePipelineError(error: Error): Promise<void> {
    orchestratorLogger.error('Pipeline error', {
      error: error.message,
      retryCount: this.retryCount,
    });

    this.emit('error', {
      error: error.message,
      recoverable: this.retryCount < OlorinVoiceOrchestrator.MAX_RETRIES,
    });

    if (this.retryCount < OlorinVoiceOrchestrator.MAX_RETRIES) {
      this.retryCount++;
      this.cleanupPipeline();
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 10000);
      await new Promise((r) => setTimeout(r, delay));

      const store = useSupportStore.getState();
      if (store.isVoiceModalOpen) {
        await this.startPipeline();
      }
    } else {
      this.retryCount = 0;
      this.cleanupPipeline();
      this.forceTransitionTo('error');
      this.triggerAnimation(getErrorSequence('unknown'));
      // Auto-recover to idle after error display
      setTimeout(() => {
        this.forceTransitionTo('idle');
      }, 3000);
    }
  }

  /** Safe pipeline cleanup */
  private cleanupPipeline(): void {
    try {
      streamingVoicePipeline.stopInteraction();
    } catch (e) {
      orchestratorLogger.warn('Error during pipeline cleanup', { error: e });
    }
    this.pipelineActive = false;
  }

  /** Cancel any pending continuation timer */
  private cancelPendingContinuation(): void {
    if (this.continuationTimeoutId) {
      clearTimeout(this.continuationTimeoutId);
      this.continuationTimeoutId = null;
    }
  }

  /** Trigger an animation sequence */
  private triggerAnimation(sequenceId: string): void {
    this.emit('animationTrigger', sequenceId);
  }

  /** Analyze response text for animation selection */
  private analyzeResultContext(response: string | null): ResultContext {
    if (!response) return { count: 0, success: false };
    const lower = response.toLowerCase();
    if (lower.includes('error') || lower.includes('went wrong') || lower.includes('failed')) {
      return { count: 0, success: false, errorType: 'unknown' };
    }
    if (lower.includes('no results') || lower.includes('nothing found') ||
        lower.includes("couldn't find") || lower.includes('sorry')) {
      return { count: 0, success: false, errorType: 'not_found' };
    }
    const countMatch = lower.match(/found (\d+)/);
    if (countMatch) {
      return { count: parseInt(countMatch[1], 10), success: true };
    }
    return { count: 1, success: true };
  }

  /** Process voice transcript and classify intent */
  async processTranscript(
    transcript: string,
    _conversationId?: string
  ): Promise<VoiceCommandResponse> {
    if (!transcript?.trim()) {
      throw new Error('Empty transcript');
    }

    orchestratorLogger.info('Processing transcript', { transcriptLength: transcript.length });

    const store = useSupportStore.getState();
    store.setCurrentTranscript(transcript);

    const response = voiceCommandProcessor.processVoiceInput(transcript);
    store.setInteractionType(response.intent);
    store.setIntentConfidence(response.confidence);
    updateGestureForIntent(response.intent);

    const command = createCommandRecord(
      transcript, response.intent, response.confidence, response.action.type
    );
    store.addCommandToHistory(command);

    return response;
  }

  /** Set avatar visibility mode */
  setAvatarVisibility(mode: AvatarMode): void {
    useSupportStore.getState().setAvatarVisibilityMode(mode);
  }

  /** Enable/disable wake word detection */
  setWakeWordEnabled(enabled: boolean): void {
    this.config.wakeWordEnabled = enabled;
    useSupportStore.getState().setWakeWordEnabled(enabled);
    if (enabled) {
      this.initializeWakeWord();
    }
  }

  /** Enable/disable streaming mode */
  setStreamingMode(enabled: boolean): void {
    this.config.streamingMode = enabled;
  }

  /** Initialize wake word detection (platform-specific) */
  private async initializeWakeWord(): Promise<void> {
    orchestratorLogger.info('Wake word detection initialized');
  }

  /** Get current configuration */
  getConfig(): VoiceConfig {
    return { ...this.config };
  }

  /** Get orchestrator state */
  getState() {
    const store = useSupportStore.getState();
    return {
      voiceState: store.voiceState,
      avatarMode: store.avatarVisibilityMode,
      currentInteractionType: store.currentInteractionType,
      lastIntentConfidence: store.lastIntentConfidence,
      isWakeWordActive: this.config.wakeWordEnabled,
      isStreamingMode: this.config.streamingMode,
      isSessionActive: store.isVoiceSessionActive,
    };
  }

  /** Check if voice is supported on this platform */
  isSupported(): boolean {
    return streamingVoicePipeline.isSupported();
  }

  /** Check if pipeline is currently active */
  isPipelineActive(): boolean {
    return this.pipelineActive;
  }

  /** Get current state machine state */
  getCurrentState(): VoiceState {
    return this.currentState;
  }
}

/** Singleton orchestrator instance - use this instead of creating new instances */
export const voiceOrchestrator = new OlorinVoiceOrchestrator(DEFAULT_VOICE_CONFIG);

export default OlorinVoiceOrchestrator;
