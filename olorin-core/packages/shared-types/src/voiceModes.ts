/**
 * Voice Operation Modes
 * Defines three distinct operational modes for voice interaction:
 * - Voice Only: Wake word activated, no remote control
 * - Hybrid: Voice + Remote with optional feedback
 * - Classic: Traditional remote-only, no voice
 */

export enum VoiceMode {
  VOICE_ONLY = 'voice_only',
  HYBRID = 'hybrid',
  CLASSIC = 'classic',
}

export interface ModeConfig {
  mode: VoiceMode;
  wakeWordEnabled: boolean;
  remoteControlEnabled: boolean;
  voiceFeedbackEnabled: boolean;
  ttsEnabled: boolean;
  uiInteractionEnabled: boolean;
  scrollingEnabled: boolean;
}

/**
 * Configuration for each voice mode
 * NO DEFAULTS - Each mode has explicit settings
 */
export const MODE_CONFIGS: Record<VoiceMode, ModeConfig> = {
  [VoiceMode.VOICE_ONLY]: {
    mode: VoiceMode.VOICE_ONLY,
    wakeWordEnabled: true,
    // Remote control remains enabled for accessibility and fallback navigation
    remoteControlEnabled: true,
    voiceFeedbackEnabled: true,
    ttsEnabled: true,
    // UI interaction and scrolling enabled for hybrid accessibility
    uiInteractionEnabled: true,
    scrollingEnabled: true,
  },
  [VoiceMode.HYBRID]: {
    mode: VoiceMode.HYBRID,
    wakeWordEnabled: true,
    remoteControlEnabled: true,
    voiceFeedbackEnabled: true,
    ttsEnabled: true,
    uiInteractionEnabled: true,
    scrollingEnabled: true,
  },
  [VoiceMode.CLASSIC]: {
    mode: VoiceMode.CLASSIC,
    wakeWordEnabled: false,
    remoteControlEnabled: true,
    voiceFeedbackEnabled: false,
    ttsEnabled: false,
    uiInteractionEnabled: true,
    scrollingEnabled: true,
  },
};

export type VoiceModeType = keyof typeof VoiceMode;
