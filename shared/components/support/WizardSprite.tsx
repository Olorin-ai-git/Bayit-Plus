/**
 * WizardSprite
 * Animated sprite component for wizard spritesheet animations
 * Supports clapping and speaking animations using 6x6 grid spritesheets
 * Uses requestAnimationFrame for smooth 60fps rendering
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Image, Animated, StyleSheet, Platform } from 'react-native';
import { isTV } from '../../utils/platform';

// Spritesheet configurations
// Note: FPS reduced for smoother animations
// totalFrames set to 35 to skip corrupt last frame in 6x6 grids
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

  // Current frame state for direct rendering (smoother than Animated for discrete frames)
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

  // Calculate translation based on current frame (direct calculation, no interpolation needed)
  const col = currentFrame % config.columns;
  const row = Math.floor(currentFrame / config.columns);
  const translateX = -col * scaledWidth;
  const translateY = -row * scaledHeight;

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
      {/* Round dark background only */}
      <View style={[styles.roundBackground, { width: scaledWidth, height: scaledHeight }]} />
      <Image
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
    borderRadius: 999, // Circular clip
  },
  roundBackground: {
    position: 'absolute',
    backgroundColor: '#0a0a0f',
    borderRadius: 999,
  },
  spritesheet: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default WizardSprite;
