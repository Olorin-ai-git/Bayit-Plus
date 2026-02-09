/**
 * WizardSprite - Web Implementation
 * Animated sprite component for wizard spritesheet animations
 * Uses CSS background-position for proper frame-by-frame animation on web
 * Supports all gesture animations with correct frame layouts
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { isTV } from '../../utils/platform';

// Spritesheet configurations - measured from actual sprite files
const SPRITESHEET_CONFIG = {
  // Large 6×6 grid spritesheets (330×362 per frame)
  clapping: {
    url: '/assets/images/characters/wizard/spritesheets/clapping/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 10,
    loop: true,
  },
  speaking: {
    url: '/assets/images/characters/wizard/spritesheets/speaking/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 10,
    loop: true,
  },
  thinking: {
    url: '/assets/images/characters/wizard/spritesheets/thinking/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 5,
    loop: true,
  },
  crying: {
    url: '/assets/images/characters/wizard/spritesheets/crying/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 5,
    loop: true,
  },
  smacking: {
    url: '/assets/images/characters/wizard/spritesheets/smacking/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 8,
    loop: false,
  },
  listening: {
    url: '/assets/images/characters/wizard/spritesheets/listening/spritesheet.png',
    frameWidth: 331,
    frameHeight: 363,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 5,
    loop: true,
  },
  clarification: {
    url: '/assets/images/characters/wizard/spritesheets/clarification/spritesheet.png',
    frameWidth: 331,
    frameHeight: 363,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 6,
    loop: false,
  },
  warning: {
    url: '/assets/images/characters/wizard/spritesheets/warning/spritesheet.png',
    frameWidth: 330,
    frameHeight: 362,
    columns: 6,
    rows: 6,
    totalFrames: 35,
    fps: 6,
    loop: false,
  },

  // 6×4 grid spritesheet
  conjuring: {
    url: '/assets/images/characters/wizard/spritesheets/conjuring/spritesheet.png',
    frameWidth: 329,
    frameHeight: 359,
    columns: 6,
    rows: 4,
    totalFrames: 24,
    fps: 6,
    loop: true,
  },

  // Wide 6×1 spritesheets (6 frames in single row, 528×1344 per frame)
  agreement: {
    url: '/assets/images/characters/wizard/spritesheets/agreement/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 6,
    loop: false,
  },
  attentive: {
    url: '/assets/images/characters/wizard/spritesheets/attentive/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 5,
    loop: true,
  },
  disagreement: {
    url: '/assets/images/characters/wizard/spritesheets/disagreement/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 5,
    loop: false,
  },
  magical_reveal: {
    url: '/assets/images/characters/wizard/spritesheets/magical_reveal/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 6,
    loop: false,
  },
  single_result: {
    url: '/assets/images/characters/wizard/spritesheets/single_result/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 6,
    loop: false,
  },
  success: {
    url: '/assets/images/characters/wizard/spritesheets/success/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 8,
    loop: false,
  },
  waiting: {
    url: '/assets/images/characters/wizard/spritesheets/waiting/spritesheet.png',
    frameWidth: 528,
    frameHeight: 1344,
    columns: 6,
    rows: 1,
    totalFrames: 6,
    fps: 4,
    loop: true,
  },

  // Small spritesheets (single row, varying dimensions)
  browsing: {
    url: '/assets/images/characters/wizard/spritesheets/browsing/spritesheet.png',
    frameWidth: 77,
    frameHeight: 89,
    columns: 5,
    rows: 1,
    totalFrames: 5,
    fps: 6,
    loop: true,
  },
  cheering: {
    url: '/assets/images/characters/wizard/spritesheets/cheering/spritesheet.png',
    frameWidth: 86,
    frameHeight: 97,
    columns: 3,
    rows: 1,
    totalFrames: 3,
    fps: 8,
    loop: true,
  },
  confirmation: {
    url: '/assets/images/characters/wizard/spritesheets/confirmation/spritesheet.png',
    frameWidth: 88,
    frameHeight: 90,
    columns: 2,
    rows: 1,
    totalFrames: 2,
    fps: 5,
    loop: false,
  },
  confused: {
    url: '/assets/images/characters/wizard/spritesheets/confused/spritesheet.png',
    frameWidth: 84,
    frameHeight: 88,
    columns: 3,
    rows: 1,
    totalFrames: 3,
    fps: 5,
    loop: true,
  },
  emphatic: {
    url: '/assets/images/characters/wizard/spritesheets/emphatic/spritesheet.png',
    frameWidth: 81,
    frameHeight: 87,
    columns: 3,
    rows: 1,
    totalFrames: 3,
    fps: 8,
    loop: true,
  },
  farewell: {
    url: '/assets/images/characters/wizard/spritesheets/farewell/spritesheet.png',
    frameWidth: 82,
    frameHeight: 97,
    columns: 4,
    rows: 1,
    totalFrames: 4,
    fps: 6,
    loop: false,
  },
  greeting: {
    url: '/assets/images/characters/wizard/spritesheets/greeting/spritesheet.png',
    frameWidth: 86,
    frameHeight: 86,
    columns: 4,
    rows: 1,
    totalFrames: 4,
    fps: 6,
    loop: false,
  },
  presenting: {
    url: '/assets/images/characters/wizard/spritesheets/presenting/spritesheet.png',
    frameWidth: 105,
    frameHeight: 97,
    columns: 2,
    rows: 1,
    totalFrames: 2,
    fps: 6,
    loop: true,
  },
  reading: {
    url: '/assets/images/characters/wizard/spritesheets/reading/spritesheet.png',
    frameWidth: 70,
    frameHeight: 91,
    columns: 4,
    rows: 1,
    totalFrames: 4,
    fps: 5,
    loop: true,
  },
  shrugging: {
    url: '/assets/images/characters/wizard/spritesheets/shrugging/spritesheet.png',
    frameWidth: 86,
    frameHeight: 92,
    columns: 3,
    rows: 1,
    totalFrames: 3,
    fps: 6,
    loop: false,
  },

  // Idle behaviors (large frames)
  shifts_weight: {
    url: '/assets/images/characters/wizard/spritesheets/idle/shifts_weight/spritesheet.png',
    frameWidth: 396,
    frameHeight: 672,
    columns: 3,
    rows: 1,
    totalFrames: 3,
    fps: 4,
    loop: false,
  },
  adjusts_hat: {
    url: '/assets/images/characters/wizard/spritesheets/idle/adjusts_hat/spritesheet.png',
    frameWidth: 396,
    frameHeight: 672,
    columns: 4,
    rows: 1,
    totalFrames: 4,
    fps: 5,
    loop: false,
  },
  looks_around: {
    url: '/assets/images/characters/wizard/spritesheets/idle/looks_around/spritesheet.png',
    frameWidth: 396,
    frameHeight: 672,
    columns: 5,
    rows: 1,
    totalFrames: 5,
    fps: 5,
    loop: false,
  },
  puffs_in: {
    url: '/assets/images/characters/wizard/spritesheets/idle/puffs_in/spritesheet.png',
    frameWidth: 396,
    frameHeight: 672,
    columns: 5,
    rows: 1,
    totalFrames: 5,
    fps: 3,  // Slower FPS for smoother appearing effect
    loop: false,
  },
  puffs_out: {
    url: '/assets/images/characters/wizard/spritesheets/idle/puffs_out/spritesheet.png',
    frameWidth: 396,
    frameHeight: 672,
    columns: 5,
    rows: 1,
    totalFrames: 5,
    fps: 3,  // Slower FPS for smoother disappearing effect
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

  // Guard against invalid spritesheet - return null if config doesn't exist
  if (!config) {
    logger.error(`WizardSprite: Invalid spritesheet "${spritesheet}". Available: ${Object.keys(SPRITESHEET_CONFIG).join(', ')}`, 'WizardSprite');
    return null;
  }

  const shouldLoop = loop !== undefined ? loop : config.loop;

  // Current frame state
  const [currentFrame, setCurrentFrame] = useState(0);
  const isPlayingRef = useRef(false);
  const frameRequestRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Calculate scale factor to fit frame into display size
  // Use the larger dimension to ensure the sprite fills the container
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
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'transparent',
        ...style,
      }}
    >
      {/* Frame clipping container - shows ONLY one frame */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          overflow: 'hidden',
          backgroundColor: 'transparent',
        }}
      >
        {/* Spritesheet positioned to show current frame */}
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: `${sheetWidth}px`,
            height: `${sheetHeight}px`,
            backgroundImage: `url(${config.url})`,
            backgroundSize: `${sheetWidth}px ${sheetHeight}px`,
            backgroundPosition: `${backgroundPositionX}px ${backgroundPositionY}px`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'auto',
            willChange: 'background-position',
          }}
        />
      </div>
    </div>
  );
};

export default WizardSprite;
