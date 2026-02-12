/**
 * useVoiceWithAvatar - Integrated Voice + Avatar Hook for tvOS
 *
 * Synchronizes voice emotional intelligence with avatar emotions and animations
 */

import { useEffect, useCallback } from 'react';
import { useEnhancedVoiceTV } from './useEnhancedVoiceTV';
import { useEnhancedVoiceStore } from '../stores/enhancedVoiceStore';
import { useAvatarStore } from '../stores/avatarStore';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useVoiceWithAvatar');

export interface UseVoiceWithAvatarResult {
  // Voice
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  hasPermissions: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;

  // Avatar
  isAvatarVisible: boolean;
  currentEmotion: string;
  showAvatar: () => void;
  hideAvatar: () => void;
}

/**
 * Integrated hook that synchronizes voice emotional intelligence with avatar
 */
export function useVoiceWithAvatar(): UseVoiceWithAvatarResult {
  const voiceHook = useEnhancedVoiceTV();
  const voiceStore = useEnhancedVoiceStore();
  const avatarStore = useAvatarStore();

  // Sync avatar emotions with voice emotional analysis
  useEffect(() => {
    const emotionalAnalysis = voiceStore.getState().emotionalAnalysis;

    if (emotionalAnalysis && avatarStore.preferences.enabled) {
      avatarStore.syncEmotionWithVoice(emotionalAnalysis.frustrationLevel);
      moduleLogger.debug('Synced avatar emotion:', {
        frustration: emotionalAnalysis.frustrationLevel,
        mood: emotionalAnalysis.mood
      });
    }
  }, [voiceStore.getState().emotionalAnalysis, avatarStore]);

  // Sync avatar animations with voice state
  useEffect(() => {
    if (!avatarStore.preferences.enabled) return;

    if (voiceHook.isListening) {
      avatarStore.startListening();
    } else {
      avatarStore.stopListening();
    }
  }, [voiceHook.isListening, avatarStore]);

  useEffect(() => {
    if (!avatarStore.preferences.enabled) return;

    const lastResponse = voiceStore.getState().lastResponse;
    if (lastResponse && lastResponse.type === 'success') {
      avatarStore.startSpeaking();

      // Stop speaking after TTS duration (estimated)
      const ttsDuration = lastResponse.ttsDurationMs || 3000;
      setTimeout(() => {
        avatarStore.stopSpeaking();
      }, ttsDuration);
    }
  }, [voiceStore.getState().lastResponse, avatarStore]);

  // Show/hide avatar based on preferences
  useEffect(() => {
    if (avatarStore.preferences.enabled && avatarStore.preferences.showOnStartup) {
      avatarStore.showAvatar();
    }
  }, [avatarStore.preferences.enabled, avatarStore.preferences.showOnStartup, avatarStore]);

  const showAvatar = useCallback(() => {
    avatarStore.showAvatar();
  }, [avatarStore]);

  const hideAvatar = useCallback(() => {
    avatarStore.hideAvatar();
  }, [avatarStore]);

  return {
    // Voice
    isListening: voiceHook.isListening,
    isProcessing: voiceHook.isProcessing,
    transcript: voiceHook.transcript,
    error: voiceHook.error,
    hasPermissions: voiceHook.hasPermissions,
    startListening: voiceHook.startListening,
    stopListening: voiceHook.stopListening,
    requestPermissions: voiceHook.requestPermissions,

    // Avatar
    isAvatarVisible: avatarStore.avatarState.isVisible,
    currentEmotion: avatarStore.avatarState.currentEmotion,
    showAvatar,
    hideAvatar,
  };
}
