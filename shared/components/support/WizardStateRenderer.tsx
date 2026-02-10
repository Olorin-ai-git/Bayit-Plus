/**
 * Wizard State Renderer
 * Renders the appropriate wizard visual (sprite animation or static image)
 * based on current voice state, gesture, and animation status
 */

import React from 'react';
import { Image } from 'react-native';
import { VoiceState, GestureState } from '../../stores/supportStore';
import { WizardSprite } from './WizardSprite';
import {
  WIZARD_AVATARS,
  GESTURE_AVATARS,
  GESTURE_TO_SPRITESHEET,
} from '../../constants/wizardAvatars';

interface WizardStateRendererProps {
  voiceState: VoiceState;
  gestureState: GestureState | null;
  effectiveGesture: string | null;
  isAnimatingGesture: boolean;
  isAppearing: boolean;
  isDisappearing: boolean;
  hasAppeared: boolean;
  isIntroComplete: boolean;
  audioLevel: number;
  wizardSize: number;
  onAppearComplete: () => void;
  onGestureComplete: () => void;
}

export const WizardStateRenderer: React.FC<WizardStateRendererProps> = ({
  voiceState,
  effectiveGesture,
  isAnimatingGesture,
  isAppearing,
  isDisappearing,
  hasAppeared,
  isIntroComplete,
  audioLevel,
  wizardSize,
  onAppearComplete,
  onGestureComplete,
}) => {
  // Priority 0: Appearing animation (puffs_in)
  if (isAppearing && !hasAppeared) {
    return (
      <WizardSprite
        spritesheet={"puffs_in" as any}
        size={wizardSize}
        playing={true}
        loop={false}
        onComplete={onAppearComplete}
      />
    );
  }

  // Priority 0b: Disappearing animation (puffs_out)
  if (isDisappearing) {
    return (
      <WizardSprite
        spritesheet={"puffs_out" as any}
        size={wizardSize}
        playing={true}
        loop={false}
      />
    );
  }

  // Priority 1: Waiting mode (after intro complete, show waiting)
  if (isIntroComplete && voiceState === 'idle') {
    return (
      <WizardSprite
        spritesheet="listening"
        size={wizardSize}
        playing={true}
        loop={true}
      />
    );
  }

  // Priority 2: Waiting during listening if no audio input
  if (isIntroComplete && voiceState === 'listening' && audioLevel < 0.02) {
    return (
      <WizardSprite
        spritesheet="listening"
        size={wizardSize}
        playing={true}
        loop={true}
      />
    );
  }

  // Priority 3: Listening animation when actively speaking
  if (voiceState === 'listening' && audioLevel >= 0.02) {
    return (
      <WizardSprite
        spritesheet="listening"
        size={wizardSize}
        playing={true}
        loop={true}
      />
    );
  }

  // Priority 4: Processing/thinking animation
  if (voiceState === 'processing') {
    return (
      <WizardSprite
        spritesheet="thinking"
        size={wizardSize}
        playing={true}
        loop={true}
      />
    );
  }

  // Priority 5: Speaking animation
  if (voiceState === 'speaking') {
    return (
      <WizardSprite
        spritesheet="speaking"
        size={wizardSize}
        playing={true}
        loop={true}
      />
    );
  }

  // Priority 6: Gesture with spritesheet animation
  const gestureToUse = effectiveGesture as GestureState | null;
  const spritesheetName = gestureToUse ? GESTURE_TO_SPRITESHEET[gestureToUse] : undefined;

  if (spritesheetName) {
    return (
      <WizardSprite
        spritesheet={spritesheetName as any}
        size={wizardSize}
        playing={isAnimatingGesture}
        onComplete={onGestureComplete}
      />
    );
  }

  // Priority 7: Static gesture image
  if (gestureToUse && GESTURE_AVATARS[gestureToUse]) {
    return (
      <Image
        source={GESTURE_AVATARS[gestureToUse]}
        className="w-full h-full"
        style={{ width: wizardSize, height: wizardSize }}
        resizeMode="contain"
      />
    );
  }

  // Priority 8: Default listening fallback
  if (voiceState === 'listening') {
    return (
      <WizardSprite
        spritesheet="listening"
        size={wizardSize}
        playing={true}
        loop={true}
      />
    );
  }

  // Default: Static voice state image
  return (
    <Image
      source={WIZARD_AVATARS[voiceState]}
      className="w-full h-full"
      style={{ width: wizardSize, height: wizardSize }}
      resizeMode="contain"
    />
  );
};

export default WizardStateRenderer;
