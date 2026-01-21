/**
 * Voice Components Export
 *
 * Central export for all voice feature components including:
 * - Voice command activation and button
 * - Voice search modal with transcription display
 * - Status indicators and visualizations
 * - Response display with command details
 * - Settings and configuration UI
 * - Command history tracking
 */

export { default as VoiceCommandButton } from './VoiceCommandButton';
export { default as VoiceWaveform } from './VoiceWaveform';
export { default as ProactiveSuggestionBanner } from './ProactiveSuggestionBanner';
export { VoiceSearchModal } from './VoiceSearchModal';
export { VoiceStatusIndicator } from './VoiceStatusIndicator';
export { VoiceResponseDisplay } from './VoiceResponseDisplay';
export { VoiceSettings } from './VoiceSettings';
export type { VoiceSettingsState } from './VoiceSettings';
export { VoiceCommandHistory } from './VoiceCommandHistory';
export type { VoiceCommand } from './VoiceCommandHistory';
