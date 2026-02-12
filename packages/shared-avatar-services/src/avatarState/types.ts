/**
 * Avatar State Types
 * Type definitions for avatar state management
 */

export interface AvatarState {
  isVisible: boolean;
  isActive: boolean;
  currentEmotion: AvatarEmotion;
  currentAnimation: AvatarAnimation;
  isSpeaking: boolean;
  isListening: boolean;
  position?: AvatarPosition;
  scale?: number;
  opacity?: number;
}

export type AvatarEmotion =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'confused'
  | 'empathetic'
  | 'apologetic';

export type AvatarAnimation =
  | 'idle'
  | 'talking'
  | 'listening'
  | 'thinking'
  | 'nodding'
  | 'greeting'
  | 'waving';

export interface AvatarPosition {
  x: number;
  y: number;
  z?: number;
}

export interface AvatarStateUpdate {
  isVisible?: boolean;
  isActive?: boolean;
  currentEmotion?: AvatarEmotion;
  currentAnimation?: AvatarAnimation;
  isSpeaking?: boolean;
  isListening?: boolean;
  position?: AvatarPosition;
  scale?: number;
  opacity?: number;
}

export interface AvatarStateListener {
  (state: AvatarState): void;
}

export interface AvatarEmotionMapping {
  frustrationLevel: number;
  emotion: AvatarEmotion;
}
