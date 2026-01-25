/**
 * WizardSprite - Native Implementation
 * Animated sprite component for wizard spritesheet animations
 * Uses Image transforms and overflow clipping for frame-by-frame animation
 * Supports clapping, speaking, thinking, listening, conjuring, crying, facepalm animations
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { isTV } from '../../utils/platform';

// Spritesheet configurations
const SPRITESHEET_CONFIG = {
  clapping: {
    source: require('../../assets/images/characters/wizard/spritesheets/clapping/spritesheet.png'),
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35, // Skip corrupt frame 35
    fps: 8,
    loop: false,
  },
  speaking: {
    source: require('../../assets/images/characters/wizard/spritesheets/speaking/spritesheet.png'),
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35, // Skip corrupt frame 35
    fps: 6,
    loop: true,
  },
  conjuring: {
    source: require('../../assets/images/characters/wizard/spritesheets/conjuring/spritesheet.png'),
    frameWidth: 329,
    frameHeight: 359,
    columns: 6,
    rows: 4,
    totalFrames: 24,
    fps: 8,
    loop: true,
  },
  thinking: {
    source: require('../../assets/images/characters/wizard/spritesheets/thinking/spritesheet.png'),
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35, // Skip corrupt frame 35
    fps: 6,
    loop: true,
  },
  listening: {
    source: require('../../assets/images/characters/wizard/spritesheets/listening/spritesheet.png'),
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35, // Skip corrupt frame 35
    fps: 6,
    loop: true,
  },
  crying: {
    source: require('../../assets/images/characters/wizard/spritesheets/crying/spritesheet.png'),
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35, // Skip corrupt frame 35
    fps: 6,
    loop: true,
  },
  facepalm: {
    source: require('../../assets/images/characters/wizard/spritesheets/smacking/spritesheet.png'),
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35, // Skip corrupt frame 35
    fps: 8,
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
 * WizardSprite - Native implementation using Image transforms
 * Renders animated spritesheet frames using viewport clipping technique
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

  // Current frame state
  const [currentFrame, setCurrentFrame] = useState(0);
  const isPlayingRef = useRef(false);
  const frameRequestRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

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
    lastFrameTimeRef.current = performance.now();
    setCurrentFrame(0);

    // Use requestAnimationFrame for smooth timing
    const animate = (timestamp: number) => {
      if (!isPlayingRef.current) return;

      const elapsed = timestamp - lastFrameTimeRef.current;

      if (elapsed >= frameDuration) {
        lastFrameTimeRef.current = timestamp - (elapsed % frameDuration);

        setCurrentFrame((prevFrame) => {
          const nextFrame = prevFrame + 1;
          if (nextFrame >= config.totalFrames) {
            if (shouldLoop) {
              return 0; // Loop back to start
            } else {
              // Animation complete
              isPlayingRef.current = false;
              // Schedule callback outside of setState
              setTimeout(() => onComplete?.(), 0);
              return prevFrame; // Stay on last frame
            }
          }
          return nextFrame;
        });
      }

      if (isPlayingRef.current) {
        frameRequestRef.current = requestAnimationFrame(animate);
      }
    };

    frameRequestRef.current = requestAnimationFrame(animate);
  }, [config.totalFrames, shouldLoop, frameDuration, onComplete]);

  const stopAnimation = useCallback(() => {
    isPlayingRef.current = false;
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
    setCurrentFrame(0);
  }, []);

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
  const col = currentFrame % config.columns;
  const row = Math.floor(currentFrame / config.columns);
  const translateX = -col * scaledWidth;
  const translateY = -row * scaledHeight;

  return (
    <View
      style={[
        styles.container,
        {
          width: scaledWidth,
          height: scaledHeight,
        },
        style,
      ]}
    >
      {/* Dark background */}
      <View
        style={[
          styles.background,
          {
            width: scaledWidth,
            height: scaledHeight,
            borderRadius: scaledWidth / 2,
          },
        ]}
      />
      {/* Spritesheet image */}
      <Image
        source={config.source}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: sheetWidth,
          height: sheetHeight,
          transform: [{ translateX }, { translateY }],
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderRadius: 999, // Large value for circular shape
    position: 'relative',
  },
  background: {
    position: 'absolute',
    backgroundColor: '#0a0a0f',
  },
});

export default WizardSprite;
