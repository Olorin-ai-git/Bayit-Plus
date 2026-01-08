/**
 * Watch Party Shims for tvOS
 *
 * WebRTC/LiveKit is not supported on tvOS, so we provide no-op shim components
 * that render nothing. This allows the PlayerScreen to work without watch party features.
 */

import React from 'react';
import { View } from 'react-native';

// Shim components that render nothing
export const WatchPartyButton: React.FC<any> = () => null;
export const WatchPartyCreateModal: React.FC<any> = () => null;
export const WatchPartyJoinModal: React.FC<any> = () => null;
export const WatchPartyOverlay: React.FC<any> = () => null;
export const WatchPartyHeader: React.FC<any> = () => null;
export const WatchPartyParticipants: React.FC<any> = () => null;
export const WatchPartyChat: React.FC<any> = () => null;
export const WatchPartyChatInput: React.FC<any> = () => null;
export const WatchPartySyncIndicator: React.FC<any> = () => null;
