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

const log = logger.scope('OlorinVoiceOrchestrator');

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
  private continuationPending = false;
  private endSessionPending = false;

  private static readonly MAX_RETRIES = 3;
  private static readonly PLAYBACK_SAFETY_TIMEOUT_MS = 10000;

  constructor(config: VoiceConfig) {
    super();
    this.config = config;
  }

  async initialize(config?: Partial<VoiceConfig>): Promise<void> {
    if (this.isInitialized) return;
    if (config) {
      this.config = { ...this.config, ...config };
    }
    if (this.config.wakeWordEnabled) {
      await this.initializeWakeWord();
    }
    streamingVoicePipeline.prewarm().catch(() => {});
    this.isInitialized = true;
    log.info('Initialized', this.config);
  }

  private transitionTo(newState: VoiceState): boolean {
    const valid = VALID_TRANSITIONS[this.currentState];
    if (!valid?.includes(newState)) {
      log.warn('Invalid state transition rejected', { from: this.currentState, to: newState });
      return false;
    }
    const prev = this.currentState;
    this.currentState = newState;
    useSupportStore.getState().setVoiceState(newState);
    this.emit('stateChange', { from: prev, to: newState });
    return true;
  }

  private forceTransitionTo(newState: VoiceState): void {
    const prev = this.currentState;
    if (prev === newState) return;
    this.currentState = newState;
    useSupportStore.getState().setVoiceState(newState);
    this.emit('stateChange', { from: prev, to: newState });
    log.info('Forced state transition', { from: prev, to: newState });
  }

  async startVoiceInteraction(trigger: VoiceTrigger = 'manual'): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Orchestrator not initialized. Call initialize() first.');
    }

    log.info('Starting voice interaction', { trigger, currentState: this.currentState });

    const store = useSupportStore.getState();

    if (trigger === 'wake-word' && this.config.autoExpandOnWakeWord) {
      if (store.avatarVisibilityMode === 'icon_only' || store.avatarVisibilityMode === 'minimal') {
        store.setAvatarVisibilityMode('compact');
      }
    }

    if (!store.isVoiceModalOpen) {
      store.openVoiceModal();
      this.triggerAnimation(getWakeUpSequence());
      log.info('Voice modal opened, animation: summon_wizard');
    }

    this.shouldStopListening = false;
    await this.startPipeline();
    log.info('Voice interaction started', { trigger });
  }

  private async startPipeline(): Promise<void> {
    if (this.pipelineActive) {
      log.info('Pipeline already active, skipping start');
      return;
    }

    try {
      this.pipelineActive = true;
      useSupportStore.getState().clearStreamingResponse();
      this.setupPipelineHandlers();

      const currentLanguage = i18n.language || this.config.language;
      streamingVoicePipeline.setConfig({ language: currentLanguage });
      const conversationId = streamingVoicePipeline.getConversationId();
      log.info('Starting pipeline', { language: currentLanguage, conversationId });

      await streamingVoicePipeline.startInteraction(conversationId);
      this.retryCount = 0;
      log.info('Pipeline started successfully');
    } catch (error) {
      this.pipelineActive = false;
      log.error('Pipeline start failed', { error: error instanceof Error ? error.message : String(error) });
      await this.handlePipelineError(
        error instanceof Error ? error : new Error('Failed to start pipeline')
      );
    }
  }

  private setupPipelineHandlers(): void {
    streamingVoicePipeline.removeAllListeners();

    streamingVoicePipeline.on('stateChange', (state) => {
      this.forceTransitionTo(state);
      if (state === 'processing') {
        useSupportStore.getState().setGestureState('thinking');
        log.info('Processing started, gesture: thinking');
      }
    });

    streamingVoicePipeline.on('transcriptUpdate', (transcript, language, isFinal) => {
      log.info('Transcript update', {
        text: transcript,
        language,
        isFinal,
        length: transcript.length,
      });
      if (isFinal && containsStopKeyword(transcript)) {
        log.info('Stop keyword detected in transcript', { transcript });
        this.shouldStopListening = true;
      }
    });

    streamingVoicePipeline.on('llmChunk', (text) => {
      log.debug('LLM chunk received', { chunkLength: text.length, preview: text.substring(0, 50) });
    });

    streamingVoicePipeline.on('intentAction', (intent, action, spokenResponse, confidence) => {
      const store = useSupportStore.getState();
      store.setInteractionType(intent as VoiceIntent);
      store.setIntentConfidence(confidence);
      store.setPendingVoiceAction(action);
      store.setLastResponse(spokenResponse);

      updateGestureForIntent(intent as VoiceIntent);

      log.info('Intent action received', {
        intent,
        actionType: action.type,
        actionPayload: action.payload,
        confidence,
        spokenResponse: spokenResponse.substring(0, 100),
        gesture: useSupportStore.getState().gestureState,
      });
    });

    streamingVoicePipeline.on('audioChunk', (audioData) => {
      log.debug('TTS audio chunk', { bytes: audioData.byteLength });
    });

    streamingVoicePipeline.on('playbackComplete', () => {
      log.info('Playback complete', {
        continuationPending: this.continuationPending,
        endSessionPending: this.endSessionPending,
        isRecording: streamingVoicePipeline.isCurrentlyRecording(),
        pipelineActive: this.pipelineActive,
        modalOpen: useSupportStore.getState().isVoiceModalOpen,
      });

      if (this.continuationPending) {
        this.continuationPending = false;
        log.info('Continuation pending - restarting listening');
        this.restartListeningForContinuation();
      } else if (this.endSessionPending) {
        this.endSessionPending = false;
        log.info('End session pending - collapsing');
        this.endSessionWithCollapse();
      } else {
        const store = useSupportStore.getState();
        if (this.pipelineActive && store.isVoiceModalOpen && !this.shouldStopListening) {
          // Already recording from handleContinuation - skip
          if (streamingVoicePipeline.isCurrentlyRecording()) {
            log.info('Already recording after playback - no action needed');
          } else {
            log.info('Modal open, restarting listening after playback');
            this.restartListeningForContinuation();
          }
        } else {
          log.info('Session inactive or modal closed - going idle');
          this.forceTransitionTo('idle');
        }
      }
    });

    streamingVoicePipeline.on('responseComplete', (conversationId) => {
      log.info('Response complete', { conversationId });
      this.handleResponseComplete(conversationId);
    });

    streamingVoicePipeline.on('error', (error) => {
      log.error('Pipeline error event', { error: error.message });
      this.handlePipelineError(error);
    });

    streamingVoicePipeline.on('connected', () => {
      log.info('WebSocket connected');
    });

    streamingVoicePipeline.on('disconnected', () => {
      log.info('WebSocket disconnected');
    });
  }

  private handleResponseComplete(conversationId: string): void {
    const store = useSupportStore.getState();
    const intent = store.currentInteractionType || 'CHAT';
    const responseText = store.lastResponse;
    const resultContext = this.analyzeResultContext(responseText);
    const sequence = getAnimationSequenceForIntent(intent, resultContext);

    log.info('Handling response complete', {
      intent,
      responsePreview: responseText?.substring(0, 100),
      responseLength: responseText?.length,
      resultContext,
      animation: sequence,
      isAudioPlaying: streamingVoicePipeline.isAudioPlaying(),
      isRecording: streamingVoicePipeline.isCurrentlyRecording(),
    });

    this.triggerAnimation(sequence);
    this.emit('streamingText', { text: responseText, isFinal: true });
    this.handleContinuation();
  }

  private handleContinuation(): void {
    this.cancelPendingContinuation();
    const store = useSupportStore.getState();
    const isPlaying = streamingVoicePipeline.isAudioPlaying();
    const isRecording = streamingVoicePipeline.isCurrentlyRecording();

    log.info('Handling continuation', {
      shouldStop: this.shouldStopListening,
      isAudioPlaying: isPlaying,
      isRecording,
      modalOpen: store.isVoiceModalOpen,
      pipelineActive: this.pipelineActive,
    });

    if (this.shouldStopListening) {
      this.shouldStopListening = false;
      if (isPlaying) {
        log.info('Stop keyword + audio playing - waiting for playback to end session');
        this.endSessionPending = true;
        this.continuationTimeoutId = setTimeout(() => {
          this.continuationTimeoutId = null;
          if (this.endSessionPending) {
            this.endSessionPending = false;
            log.warn('End session playback timeout - forcing collapse');
            this.endSessionWithCollapse();
          }
        }, OlorinVoiceOrchestrator.PLAYBACK_SAFETY_TIMEOUT_MS);
      } else {
        log.info('Stop keyword + no audio - ending session now');
        this.endSessionWithCollapse();
      }
      return;
    }

    if (store.isVoiceModalOpen) {
      if (isPlaying) {
        log.info('Audio still playing - setting continuation pending for playbackComplete');
        this.continuationPending = true;
        this.continuationTimeoutId = setTimeout(() => {
          this.continuationTimeoutId = null;
          if (this.continuationPending) {
            this.continuationPending = false;
            log.warn('Playback completion timeout - forcing continuation');
            this.restartListeningForContinuation();
          }
        }, OlorinVoiceOrchestrator.PLAYBACK_SAFETY_TIMEOUT_MS);
      } else if (isRecording) {
        // Already recording (pipeline restarted recording before responseComplete)
        log.info('Already recording - skipping restart');
      } else {
        log.info('No audio playing, not recording - restarting listening immediately');
        this.restartListeningForContinuation();
      }
    } else {
      log.info('Modal closed - not continuing');
    }
  }

  private async restartListeningForContinuation(): Promise<void> {
    const store = useSupportStore.getState();

    // Guard: skip if already recording
    if (streamingVoicePipeline.isCurrentlyRecording()) {
      log.info('Skip restart - already recording');
      return;
    }

    if (this.pipelineActive && store.isVoiceModalOpen && !this.shouldStopListening) {
      try {
        log.info('Restarting listening for continuation');
        await streamingVoicePipeline.restartListening();
      } catch (error) {
        log.error('Failed to restart listening', { error: error instanceof Error ? error.message : String(error) });
        this.forceTransitionTo('idle');
      }
    } else {
      log.info('Cannot restart - going idle', {
        pipelineActive: this.pipelineActive,
        modalOpen: store.isVoiceModalOpen,
        shouldStop: this.shouldStopListening,
      });
      this.forceTransitionTo('idle');
    }
  }

  private endSessionWithCollapse(): void {
    log.info('Ending session with avatar collapse');
    this.endSession();
    useSupportStore.getState().setAvatarVisibilityMode('icon_only');
  }

  stopListening(): void {
    this.cancelPendingContinuation();
    if (this.pipelineActive) {
      streamingVoicePipeline.commit('button');
    }
    log.info('Stopped listening (user action)');
  }

  interrupt(): void {
    this.cancelPendingContinuation();
    if (this.pipelineActive) {
      streamingVoicePipeline.cancel();
    }
    useSupportStore.getState().clearStreamingResponse();
    this.forceTransitionTo('idle');
    log.info('Interrupted');
  }

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
    log.info('Session ended');
  }

  private async handlePipelineError(error: Error): Promise<void> {
    log.error('Pipeline error', { error: error.message, retryCount: this.retryCount });

    this.emit('error', {
      error: error.message,
      recoverable: this.retryCount < OlorinVoiceOrchestrator.MAX_RETRIES,
    });

    if (this.retryCount < OlorinVoiceOrchestrator.MAX_RETRIES) {
      this.retryCount++;
      this.cleanupPipeline();
      const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 10000);
      log.info('Retrying pipeline', { attempt: this.retryCount, delayMs: delay });
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
      log.error('Max retries reached - showing error state');
      setTimeout(() => {
        this.forceTransitionTo('idle');
      }, 3000);
    }
  }

  private cleanupPipeline(): void {
    try {
      streamingVoicePipeline.stopInteraction();
    } catch (e) {
      log.warn('Error during pipeline cleanup', { error: e });
    }
    this.pipelineActive = false;
  }

  private cancelPendingContinuation(): void {
    if (this.continuationTimeoutId) {
      clearTimeout(this.continuationTimeoutId);
      this.continuationTimeoutId = null;
    }
    this.continuationPending = false;
    this.endSessionPending = false;
  }

  private triggerAnimation(sequenceId: string): void {
    log.info('Animation triggered', { sequenceId });
    this.emit('animationTrigger', sequenceId);
  }

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

  async processTranscript(
    transcript: string,
    _conversationId?: string
  ): Promise<VoiceCommandResponse> {
    if (!transcript?.trim()) {
      throw new Error('Empty transcript');
    }

    log.info('Processing transcript', { transcript, length: transcript.length });

    const store = useSupportStore.getState();
    store.setCurrentTranscript(transcript);

    const response = voiceCommandProcessor.processVoiceInput(transcript);
    store.setInteractionType(response.intent);
    store.setIntentConfidence(response.confidence);
    updateGestureForIntent(response.intent);

    log.info('Transcript classified', {
      intent: response.intent,
      confidence: response.confidence,
      actionType: response.action.type,
      spokenResponse: response.spokenResponse?.substring(0, 80),
    });

    const command = createCommandRecord(
      transcript, response.intent, response.confidence, response.action.type
    );
    store.addCommandToHistory(command);

    return response;
  }

  setAvatarVisibility(mode: AvatarMode): void {
    useSupportStore.getState().setAvatarVisibilityMode(mode);
  }

  setWakeWordEnabled(enabled: boolean): void {
    this.config.wakeWordEnabled = enabled;
    useSupportStore.getState().setWakeWordEnabled(enabled);
    if (enabled) {
      this.initializeWakeWord();
    }
  }

  setStreamingMode(enabled: boolean): void {
    this.config.streamingMode = enabled;
  }

  private async initializeWakeWord(): Promise<void> {
    log.info('Wake word detection initialized');
  }

  getConfig(): VoiceConfig {
    return { ...this.config };
  }

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

  isSupported(): boolean {
    return streamingVoicePipeline.isSupported();
  }

  isPipelineActive(): boolean {
    return this.pipelineActive;
  }

  getCurrentState(): VoiceState {
    return this.currentState;
  }
}

export const voiceOrchestrator = new OlorinVoiceOrchestrator(DEFAULT_VOICE_CONFIG);

export default OlorinVoiceOrchestrator;
