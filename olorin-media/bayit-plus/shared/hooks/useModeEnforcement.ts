/**
 * Mode Enforcement Hook
 * Enforces voice mode rules across the application
 * Disables/enables features based on current mode configuration
 *
 * Three modes:
 * 1. Voice Only - No remote/UI interaction, fully conversational
 * 2. Hybrid - Both voice and remote, optional voice feedback
 * 3. Classic - Remote only, no voice features
 */

import { useEffect } from 'react';
import { useVoiceSettingsStore, VoiceMode } from '../stores/voiceSettingsStore';

interface ModeEnforcementState {
  isRemoteControlEnabled: boolean;
  isUIInteractionEnabled: boolean;
  isScrollingEnabled: boolean;
  isWakeWordEnabled: boolean;
  isTTSEnabled: boolean;
  isVoiceFeedbackEnabled: boolean;
  currentMode: VoiceMode;
}

/**
 * Hook to enforce voice mode rules
 * Returns the current enforcement state based on selected mode
 */
export function useModeEnforcement(): ModeEnforcementState {
  const { modeConfig, preferences } = useVoiceSettingsStore();

  const state: ModeEnforcementState = {
    isRemoteControlEnabled: modeConfig.remoteControlEnabled,
    isUIInteractionEnabled: modeConfig.uiInteractionEnabled,
    isScrollingEnabled: modeConfig.scrollingEnabled,
    isWakeWordEnabled: modeConfig.wakeWordEnabled,
    isTTSEnabled: modeConfig.ttsEnabled,
    isVoiceFeedbackEnabled: modeConfig.voiceFeedbackEnabled && preferences.voice_feedback_enabled,
    currentMode: preferences.voice_mode || VoiceMode.VOICE_ONLY,
  };

  // Apply enforcement rules
  useEffect(() => {
    // Disable pointer events and interactions in Voice Only mode
    if (state.currentMode === VoiceMode.VOICE_ONLY) {
      // Mark interactive elements as disabled for Voice Only mode
      document.documentElement.setAttribute('data-voice-mode', 'voice-only');
    } else if (state.currentMode === VoiceMode.HYBRID) {
      document.documentElement.setAttribute('data-voice-mode', 'hybrid');
    } else {
      document.documentElement.setAttribute('data-voice-mode', 'classic');
    }

    return () => {
      document.documentElement.removeAttribute('data-voice-mode');
    };
  }, [state.currentMode]);

  return state;
}

/**
 * Hook to check if a specific interaction is allowed
 * Use this in components to conditionally enable/disable features
 */
export function useIsInteractionAllowed(interactionType: 'click' | 'scroll' | 'remote' | 'voice' | 'ui'): boolean {
  const modeState = useModeEnforcement();

  switch (interactionType) {
    case 'click':
    case 'ui':
      return modeState.isUIInteractionEnabled;
    case 'scroll':
      return modeState.isScrollingEnabled;
    case 'remote':
      return modeState.isRemoteControlEnabled;
    case 'voice':
      return modeState.isTTSEnabled;
    default:
      return true;
  }
}

/**
 * Hook to disable UI elements based on mode
 * Returns a function to call in event handlers
 *
 * Example:
 * const preventInteraction = usePreventInteractionInVoiceOnly();
 * <button onClick={() => { preventInteraction() && navigate('/path'); }} />
 */
export function usePreventInteractionInVoiceOnly(): (callback?: () => void) => void {
  const { isUIInteractionEnabled } = useModeEnforcement();

  return (callback?: () => void) => {
    if (isUIInteractionEnabled && callback) {
      callback();
    } else if (!isUIInteractionEnabled) {
      console.debug('[Voice Mode] Interaction blocked: UI interactions disabled in current mode');
    }
  };
}

/**
 * Hook to get mode-specific CSS classes
 * Use this to apply styling based on current mode
 */
export function useModeClasses(): {
  modeClass: string;
  isVoiceOnly: boolean;
  isHybrid: boolean;
  isClassic: boolean;
} {
  const { currentMode } = useModeEnforcement();

  return {
    modeClass: `voice-mode-${currentMode}`,
    isVoiceOnly: currentMode === VoiceMode.VOICE_ONLY,
    isHybrid: currentMode === VoiceMode.HYBRID,
    isClassic: currentMode === VoiceMode.CLASSIC,
  };
}

/**
 * Hook to disable interactive elements in Voice Only mode
 * Apply this to components that should only work in non-Voice-Only modes
 */
export function useDisableInVoiceOnly(): {
  isDisabled: boolean;
  className: string;
} {
  const { isUIInteractionEnabled } = useModeEnforcement();

  return {
    isDisabled: !isUIInteractionEnabled,
    className: !isUIInteractionEnabled ? 'voice-only-disabled pointer-events-none opacity-50' : '',
  };
}

export default useModeEnforcement;
