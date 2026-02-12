/**
 * Avatar Preferences Types
 * Type definitions for avatar user preferences
 */

import type { AvatarStyle, AvatarQuality } from '../avatarGeneration/types';

export interface AvatarPreferences {
  enabled: boolean;
  avatarId?: string;
  style: AvatarStyle;
  quality: AvatarQuality;
  showOnStartup: boolean;
  autoHideAfterResponse: boolean;
  autoHideDelay: number; // milliseconds
  position: PreferredPosition;
  size: AvatarSize;
  voiceEnabled: boolean;
  animationsEnabled: boolean;
  emotionsEnabled: boolean;
}

export type PreferredPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'
  | 'center';

export type AvatarSize = 'small' | 'medium' | 'large';

export interface AvatarPreferencesUpdate {
  enabled?: boolean;
  avatarId?: string;
  style?: AvatarStyle;
  quality?: AvatarQuality;
  showOnStartup?: boolean;
  autoHideAfterResponse?: boolean;
  autoHideDelay?: number;
  position?: PreferredPosition;
  size?: AvatarSize;
  voiceEnabled?: boolean;
  animationsEnabled?: boolean;
  emotionsEnabled?: boolean;
}

export interface PreferencesStorageAdapter {
  save(preferences: AvatarPreferences): Promise<void>;
  load(): Promise<AvatarPreferences | null>;
  clear(): Promise<void>;
}
