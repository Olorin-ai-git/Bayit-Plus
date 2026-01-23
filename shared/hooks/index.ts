// Platform-agnostic hooks - safe for all platforms (web, TV, mobile)
export { useDirection } from './useDirection';
export { useDeviceLayout } from './useDeviceLayout';
export { usePermissions } from './usePermissions';
export { useShabbatMode, ShabbatModeProvider } from './useShabbatMode';
export { useConstantListening } from './useConstantListening';
export type { UseConstantListeningOptions, UseConstantListeningReturn } from './useConstantListening';
export { useModeEnforcement } from './useModeEnforcement';
export { useWakeWordListening } from './useWakeWordListening';
export type { UseWakeWordListeningOptions, UseWakeWordListeningReturn } from './useWakeWordListening';
export { useSearch } from './useSearch';
export { useVoiceSupport } from './useVoiceSupport';
export { useWakeWordSupport } from './useWakeWordSupport';
export { useLiveDubbing } from './useLiveDubbing';
export type { UseLiveDubbingOptions, UseLiveDubbingState, UseLiveDubbingReturn } from './useLiveDubbing';
export { useYouTubeThumbnail } from './useYouTubeThumbnail';

// Voice-first conversational interface hooks (Phases 4-10)
// These hooks depend on react-router-dom and are in a separate export for TV apps
// Import from '@bayit/shared-hooks/voice' for web-only usage
