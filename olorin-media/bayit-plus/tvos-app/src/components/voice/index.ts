/**
 * TV Voice Components Index
 * Exports all voice UI components for tvOS
 *
 * UNIFIED VOICE SYSTEM - Phase 4 (tvOS Platform)
 * Old components deprecated in favor of shared VoiceInteractionPanel
 */

// Export unified voice panel (replaces TVVoiceIndicator, TVVoiceWaveform, TVVoiceResponseDisplay)
export { VoiceInteractionPanel } from '@bayit/shared/components/voice/VoiceInteractionPanel';

// Deprecated: Legacy TV voice components (will be removed in Phase 5)
// export { TVVoiceIndicator } from './TVVoiceIndicator';
// export { TVVoiceResponseDisplay } from './TVVoiceResponseDisplay';
// export { TVVoiceWaveform } from './TVVoiceWaveform';

// Keep TV-specific components
export { TVVoiceCommandHistory } from './TVVoiceCommandHistory';
export { TVVoiceSettings } from './TVVoiceSettings';
export { TVAvatarPreferences } from './TVAvatarPreferences';
export { TVProactiveSuggestionBanner } from './TVProactiveSuggestionBanner';
export { TVVoiceErrorAlert } from './TVVoiceErrorAlert';
export { TVVoicePermissionsScreen } from './TVVoicePermissionsScreen';
export { TVVoiceDemo } from './TVVoiceDemo';
