/**
 * Olorin Voice Orchestrator
 * Unified entry point for voice interactions across all platforms
 */

import { useSupportStore } from '../stores/supportStore';
import { voiceCommandProcessor, VoiceCommandResponse } from './voiceCommandProcessor';
import { VoiceConfig, VoiceTrigger, AvatarMode } from '../types/voiceAvatar';
import { logger } from '../utils/logger';
import { updateGestureForIntent, createCommandRecord } from './voiceOrchestratorHelpers';

const orchestratorLogger = logger.scope('OlorinVoiceOrchestrator');

export class OlorinVoiceOrchestrator {
  private config: VoiceConfig;
  private isInitialized: boolean = false;
  private isListening: boolean = false;
  private currentConversationId: string | null = null;

  constructor(config: VoiceConfig) {
    this.config = config;
  }

  /** Initialize orchestrator with optional config overrides */
  async initialize(config?: Partial<VoiceConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize wake word detection if enabled
    if (this.config.wakeWordEnabled) {
      await this.initializeWakeWord();
    }

    this.isInitialized = true;
    orchestratorLogger.info('Initialized', this.config);
  }

  /** Start listening for voice input */
  async startListening(trigger: VoiceTrigger = 'manual'): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Orchestrator not initialized. Call initialize() first.');
    }

    if (this.isListening) {
      orchestratorLogger.warn('Already listening');
      return;
    }

    this.isListening = true;

    // Update store state
    const store = useSupportStore.getState();
    store.setVoiceState('listening');

    // Auto-expand avatar if wake word triggered
    if (trigger === 'wake-word' && this.config.autoExpandOnWakeWord) {
      if (store.avatarVisibilityMode === 'icon_only' || store.avatarVisibilityMode === 'minimal') {
        store.setAvatarVisibilityMode('compact');
      }
    }

    // Open voice modal if not already open
    if (!store.isVoiceModalOpen) {
      store.openVoiceModal();
    }

    orchestratorLogger.info('Started listening', { trigger });
  }

  /** Stop listening for voice input */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;

    // Update store state
    const store = useSupportStore.getState();
    store.setVoiceState('idle');

    orchestratorLogger.info('Stopped listening');
  }

  /** Interrupt current voice interaction */
  async interrupt(): Promise<void> {
    await this.stopListening();

    const store = useSupportStore.getState();
    store.setVoiceState('idle');
    store.setCurrentTranscript('');

    orchestratorLogger.info('Interrupted');
  }

  /** Process voice transcript and classify intent */
  async processTranscript(
    transcript: string,
    conversationId?: string
  ): Promise<VoiceCommandResponse> {
    if (!transcript || !transcript.trim()) {
      throw new Error('Empty transcript');
    }

    orchestratorLogger.info('Processing transcript', { transcriptLength: transcript.length });

    const store = useSupportStore.getState();
    store.setVoiceState('processing');
    store.setCurrentTranscript(transcript);

    // Use existing voice command processor for intent classification
    const response = voiceCommandProcessor.processVoiceInput(transcript);

    // Store intent and confidence
    store.setInteractionType(response.intent);
    store.setIntentConfidence(response.confidence);

    // Update gesture and add to history
    updateGestureForIntent(response.intent);
    const command = createCommandRecord(
      transcript,
      response.intent,
      response.confidence,
      response.action.type
    );
    store.addCommandToHistory(command);

    return response;
  }

  /** Set avatar visibility mode */
  setAvatarVisibility(mode: AvatarMode): void {
    const store = useSupportStore.getState();
    store.setAvatarVisibilityMode(mode);
  }

  /** Enable/disable wake word detection */
  setWakeWordEnabled(enabled: boolean): void {
    this.config.wakeWordEnabled = enabled;

    const store = useSupportStore.getState();
    store.setWakeWordEnabled(enabled);

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
    };
  }
}

export default OlorinVoiceOrchestrator;
