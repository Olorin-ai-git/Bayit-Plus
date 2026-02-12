/**
 * useVoiceWithAvatar - Integrated Voice + Avatar Hook for Web
 *
 * Synchronizes voice emotional intelligence with avatar emotions and animations
 */

import { useEffect } from 'react';
import { useEnhancedVoiceStore } from '@/stores/enhancedVoiceStore';
import { useEnhancedAvatarStore } from '@/stores/enhancedAvatarStore';

export interface UseVoiceWithAvatarResult {
  // Voice state
  isListening: boolean;
  isProcessing: boolean;
  currentTranscript: string;
  lastCommand: string | null;
  lastResponse: string | null;
  error: string | null;
  emotionalAnalysis: ReturnType<typeof useEnhancedVoiceStore>['emotionalAnalysis'];

  // Voice actions
  startSession: () => void;
  endSession: () => void;
  setListening: (listening: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setTranscript: (transcript: string) => void;
  processTranscriptionWithEI: (transcription: string, confidence: number) => void;
  addCommandToHistory: (command: string, success: boolean) => void;
  getAdaptiveTTSRate: () => number;
  shouldOfferHelp: () => boolean;
  getHelpSuggestion: () => string | undefined;

  // Avatar state
  isAvatarVisible: boolean;
  isAvatarEnabled: boolean;
  currentEmotion: string;
  currentAnimation: string;
  isSpeaking: boolean;
  avatarMeshUrl: string | null;

  // Avatar actions
  showAvatar: () => void;
  hideAvatar: () => void;
  generateAvatar: (userId: string, photoUrl: string) => Promise<void>;
  enableAvatar: () => Promise<void>;
  disableAvatar: () => Promise<void>;
}

/**
 * Integrated hook that synchronizes voice emotional intelligence with avatar
 */
export function useVoiceWithAvatar(): UseVoiceWithAvatarResult {
  const voiceStore = useEnhancedVoiceStore();
  const avatarStore = useEnhancedAvatarStore();

  // Sync avatar emotions with voice emotional analysis
  useEffect(() => {
    const { emotionalAnalysis } = voiceStore;

    if (emotionalAnalysis && avatarStore.preferences.enabled && avatarStore.preferences.emotionsEnabled) {
      avatarStore.syncEmotionWithVoice(emotionalAnalysis.frustrationLevel);
    }
  }, [voiceStore.emotionalAnalysis, avatarStore.preferences.enabled, avatarStore.preferences.emotionsEnabled]);

  // Sync avatar animations with voice state
  useEffect(() => {
    if (!avatarStore.preferences.enabled || !avatarStore.preferences.animationsEnabled) return;

    if (voiceStore.isListening) {
      avatarStore.startListening();
    } else {
      avatarStore.stopListening();
    }
  }, [voiceStore.isListening, avatarStore.preferences.enabled, avatarStore.preferences.animationsEnabled]);

  // Handle TTS speaking state
  useEffect(() => {
    if (!avatarStore.preferences.enabled || !avatarStore.preferences.animationsEnabled) return;

    if (voiceStore.lastResponse) {
      avatarStore.startSpeaking();

      // Estimate TTS duration based on text length
      const textLength = voiceStore.lastResponse.length;
      const wordsPerMinute = 150;
      const estimatedDuration = (textLength / 5) / wordsPerMinute * 60 * 1000;

      setTimeout(() => {
        avatarStore.stopSpeaking();
      }, estimatedDuration);
    }
  }, [voiceStore.lastResponse, avatarStore.preferences.enabled, avatarStore.preferences.animationsEnabled]);

  // Show avatar on startup if configured
  useEffect(() => {
    if (avatarStore.preferences.enabled && avatarStore.preferences.showOnStartup) {
      avatarStore.showAvatar();
    }
  }, [avatarStore.preferences.enabled, avatarStore.preferences.showOnStartup]);

  return {
    // Voice state
    isListening: voiceStore.isListening,
    isProcessing: voiceStore.isProcessing,
    currentTranscript: voiceStore.currentTranscript,
    lastCommand: voiceStore.lastCommand,
    lastResponse: voiceStore.lastResponse,
    error: voiceStore.error,
    emotionalAnalysis: voiceStore.emotionalAnalysis,

    // Voice actions
    startSession: voiceStore.startSession,
    endSession: voiceStore.endSession,
    setListening: voiceStore.setListening,
    setProcessing: voiceStore.setProcessing,
    setTranscript: voiceStore.setTranscript,
    processTranscriptionWithEI: voiceStore.processTranscriptionWithEI,
    addCommandToHistory: voiceStore.addCommandToHistory,
    getAdaptiveTTSRate: voiceStore.getAdaptiveTTSRate,
    shouldOfferHelp: voiceStore.shouldOfferHelp,
    getHelpSuggestion: voiceStore.getHelpSuggestion,

    // Avatar state
    isAvatarVisible: avatarStore.avatarState.isVisible,
    isAvatarEnabled: avatarStore.preferences.enabled,
    currentEmotion: avatarStore.avatarState.currentEmotion,
    currentAnimation: avatarStore.avatarState.currentAnimation,
    isSpeaking: avatarStore.avatarState.isSpeaking,
    avatarMeshUrl: avatarStore.currentAvatar?.meshUrl || null,

    // Avatar actions
    showAvatar: avatarStore.showAvatar,
    hideAvatar: avatarStore.hideAvatar,
    generateAvatar: avatarStore.generateAvatar,
    enableAvatar: avatarStore.enableAvatar,
    disableAvatar: avatarStore.disableAvatar,
  };
}
