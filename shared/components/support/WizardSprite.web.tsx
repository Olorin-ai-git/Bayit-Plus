/**
 * WizardSprite - Web Implementation
 * Animated sprite component for wizard spritesheet animations
 * Uses CSS background-position for proper frame-by-frame animation on web
 * Supports clapping, speaking, thinking, listening, conjuring, crying, facepalm animations
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { isTV } from '../../utils/platform';

// Spritesheet configurations
const SPRITESHEET_CONFIG = {
  clapping: {
    url: '/assets/images/characters/wizard/spritesheets/clapping/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35, // Skip corrupt frame 35
    fps: 8,
    loop: false,
  },
  speaking: {
    url: '/assets/images/characters/wizard/spritesheets/speaking/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35, // Skip corrupt frame 35
    fps: 6,
    loop: true,
  },
  conjuring: {
    url: '/assets/images/characters/wizard/spritesheets/conjuring/spritesheet.png',
    frameWidth: 329,
    frameHeight: 359,
    columns: 6,
    rows: 4,
    totalFrames: 24,
    fps: 8,
    loop: true,
  },
  thinking: {
    url: '/assets/images/characters/wizard/spritesheets/thinking/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35, // Skip corrupt frame 35
    fps: 6,
    loop: true,
  },
  listening: {
    url: '/assets/images/characters/wizard/spritesheets/listening/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35, // Skip corrupt frame 35
    fps: 6,
    loop: true,
  },
  crying: {
    url: '/assets/images/characters/wizard/spritesheets/crying/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35, // Skip corrupt frame 35
    fps: 6,
    loop: true,
  },
  facepalm: {
    url: '/assets/images/characters/wizard/spritesheets/smacking/spritesheet.png',
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
  style?: React.CSSProperties;
}

/**
 * WizardSprite - Web implementation using CSS background-position
 * Renders animated spritesheet frames using CSS sprites technique
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
  const scaledWidth = Math.round(config.frameWidth * scale);
  const scaledHeight = Math.round(config.frameHeight * scale);

  // Full spritesheet dimensions when scaled
  const sheetWidth = Math.round(config.frameWidth * config.columns * scale);
  const sheetHeight = Math.round(config.frameHeight * config.rows * scale);

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

  // Calculate background position based on current frame
  const col = currentFrame % config.columns;
  const row = Math.floor(currentFrame / config.columns);
  const backgroundPositionX = -col * scaledWidth;
  const backgroundPositionY = -row * scaledHeight;

  return (
    <div
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#0a0a0f',
        ...style,
      }}
    >
      <div
        style={{
          width: `${sheetWidth}px`,
          height: `${sheetHeight}px`,
          backgroundImage: `url(${config.url})`,
          backgroundSize: `${sheetWidth}px ${sheetHeight}px`,
          backgroundPosition: `${backgroundPositionX}px ${backgroundPositionY}px`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'crisp-edges',
        }}
      />
    </div>
  );
};

export default WizardSprite;
