/**
 * Watch Party Components for tvOS
 *
 * Provides text-only watch party functionality for tvOS.
 * WebRTC/LiveKit audio is not supported on tvOS, so we use:
 * - Text chat via WebSocket and REST API
 * - Playback synchronization with host
 * - No audio controls or speaking indicators
 *
 * Most components are re-exported from shared with text-only overlay.
 */

// Re-export standard shared components that work on tvOS
export { WatchPartyButton } from '@bayit/shared/watchparty/WatchPartyButton';
export { WatchPartyCreateModal } from '@bayit/shared/watchparty/WatchPartyCreateModal';
export { WatchPartyJoinModal } from '@bayit/shared/watchparty/WatchPartyJoinModal';
export { WatchPartyHeader } from '@bayit/shared/watchparty/WatchPartyHeader';
export { WatchPartyParticipants } from '@bayit/shared/watchparty/WatchPartyParticipants';
export { WatchPartyChat } from '@bayit/shared/watchparty/WatchPartyChat';
export { WatchPartyChatInput } from '@bayit/shared/watchparty/WatchPartyChatInput';
export { WatchPartySyncIndicator } from '@bayit/shared/watchparty/WatchPartySyncIndicator';

// Export text-only overlay for tvOS (no audio controls)
export { WatchPartyTextOverlay as WatchPartyOverlay } from '@bayit/shared/watchparty/WatchPartyTextOverlay';
export { WatchPartyTextPanel } from '@bayit/shared/watchparty/WatchPartyTextPanel';
