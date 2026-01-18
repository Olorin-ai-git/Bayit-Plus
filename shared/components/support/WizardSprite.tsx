/**
 * WizardSprite
 * Animated sprite component for wizard spritesheet animations
 * Supports clapping and speaking animations using 6x6 grid spritesheets
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Image, Animated, StyleSheet } from 'react-native';
import { isTV } from '../../utils/platform';

// Spritesheet configurations
const SPRITESHEET_CONFIG = {
  clapping: {
    source: require('../../assets/images/characters/wizard/spritesheets/clapping/spritesheet.png'),
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 36,
    fps: 12,
    loop: false,
  },
  speaking: {
    source: require('../../assets/images/characters/wizard/spritesheets/speaking/spritesheet.png'),
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 36,
    fps: 12,
    loop: true,
  },
  conjuring: {
    source: require('../../assets/images/characters/wizard/spritesheets/conjuring/spritesheet.png'),
    frameWidth: 329,
    frameHeight: 359,
    columns: 6,
    rows: 4,
    totalFrames: 24,
    fps: 12,
    loop: true,
  },
  thinking: {
    source: require('../../assets/images/characters/wizard/spritesheets/thinking/spritesheet.png'),
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 36,
    fps: 12,
    loop: true,
  },
  listening: {
    source: require('../../assets/images/characters/wizard/spritesheets/listening/spritesheet.png'),
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 36,
    fps: 12,
    loop: true,
  },
  crying: {
    source: require('../../assets/images/characters/wizard/spritesheets/crying/spritesheet.png'),
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 36,
    fps: 8,
    loop: true,
  },
  facepalm: {
    source: require('../../assets/images/characters/wizard/spritesheets/smacking/spritesheet.png'),
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 36,
    fps: 10,
    loop: false,
  },
} as const;

export type SpritesheetType = keyof typeof SPRITESHEET_CONFIG;

interface WizardSpriteProps {
  /** Which spritesheet animation to play */
  spritesheet: SpritesheetType;
  /** Display size (will scale frames to this size) */
  size?: number;
  /** Whether animation is currently playing */
  playing: boolean;
  /** Override loop setting from config */
  loop?: boolean;
  /** Callback when animation completes (for non-looping animations) */
  onComplete?: () => void;
  /** Optional style overrides */
  style?: object;
}

/**
 * WizardSprite - Renders animated spritesheet frames
 * Uses a viewport (overflow hidden) and translates the spritesheet image
 * to show different frames in sequence
 */
export const WizardSprite: React.FC<WizardSpriteProps> = ({
  spritesheet,
  size = isTV ? 180 : 160,
  playing,
  loop,
  onComplete,
  style,
}) => {
  const config = SPRITESHEET_CONFIG[spritesheet];
  const shouldLoop = loop !== undefined ? loop : config.loop;

  // Animation value (0 to totalFrames - 1)
  const frameAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isPlayingRef = useRef(false);

  // Calculate scale factor to fit frame into display size
  const scale = size / Math.max(config.frameWidth, config.frameHeight);
  const scaledWidth = config.frameWidth * scale;
  const scaledHeight = config.frameHeight * scale;

  // Full spritesheet dimensions when scaled
  const sheetWidth = config.frameWidth * config.columns * scale;
  const sheetHeight = config.frameHeight * config.rows * scale;

  // Frame duration in ms
  const frameDuration = 1000 / config.fps;

  const startAnimation = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    // Reset to frame 0
    frameAnim.setValue(0);

    // Create frame-by-frame animation
    const animateFrame = (currentFrame: number) => {
      if (!isPlayingRef.current) return;

      if (currentFrame >= config.totalFrames) {
        if (shouldLoop) {
          // Restart from frame 0
          frameAnim.setValue(0);
          animateFrame(0);
        } else {
          // Animation complete
          isPlayingRef.current = false;
          onComplete?.();
        }
        return;
      }

      // Animate to next frame
      animationRef.current = Animated.timing(frameAnim, {
        toValue: currentFrame,
        duration: 0, // Instant jump to frame
        useNativeDriver: true,
      });

      animationRef.current.start(() => {
        // Schedule next frame
        setTimeout(() => {
          animateFrame(currentFrame + 1);
        }, frameDuration);
      });
    };

    animateFrame(0);
  }, [frameAnim, config.totalFrames, shouldLoop, frameDuration, onComplete]);

  const stopAnimation = useCallback(() => {
    isPlayingRef.current = false;
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    frameAnim.setValue(0);
  }, [frameAnim]);

  // Handle play/pause
  useEffect(() => {
    if (playing) {
      startAnimation();
    } else {
      stopAnimation();
    }

    return () => {
      stopAnimation();
    };
  }, [playing, startAnimation, stopAnimation]);

  // Calculate translation based on current frame
  const translateX = frameAnim.interpolate({
    inputRange: Array.from({ length: config.totalFrames }, (_, i) => i),
    outputRange: Array.from({ length: config.totalFrames }, (_, i) => {
      const col = i % config.columns;
      return -col * scaledWidth;
    }),
  });

  const translateY = frameAnim.interpolate({
    inputRange: Array.from({ length: config.totalFrames }, (_, i) => i),
    outputRange: Array.from({ length: config.totalFrames }, (_, i) => {
      const row = Math.floor(i / config.columns);
      return -row * scaledHeight;
    }),
  });

  return (
    <View
      style={[
        styles.viewport,
        {
          width: scaledWidth,
          height: scaledHeight,
        },
        style,
      ]}
    >
      {/* Subtle glass background to mask sprite transparency - no visible border */}
      <View style={styles.glassBackground} />

      <Animated.Image
        source={config.source}
        style={[
          styles.spritesheet,
          {
            width: sheetWidth,
            height: sheetHeight,
            transform: [{ translateX }, { translateY }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  viewport: {
    overflow: 'hidden',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderRadius: 999, // Full circle to match sprite shape
  },
  glassBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 10, 0.7)', // glass.bg - blends with panel
    borderRadius: 999, // Full circle
    // No visible border - transparent masking only
  },
  spritesheet: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default WizardSprite;
