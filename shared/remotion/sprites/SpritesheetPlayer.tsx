/**
 * SpritesheetPlayer - Remotion Component
 * Generic spritesheet renderer using Remotion hooks for smooth animations
 * Supports all grid layouts (6×6, 6×4, 6×1, varying sizes)
 */

import React from 'react';
import { useCurrentFrame, staticFile } from 'remotion';
import { SPRITESHEET_CONFIG, SpritesheetType, getSpritesheetFrame } from './SpritesheetConfig';
import { logger } from '../../utils/logger';

interface SpritesheetPlayerProps {
  /** Which spritesheet animation to render */
  spritesheet: SpritesheetType;
  /** Display size (width and height in pixels) */
  size?: number;
  /** Optional style overrides */
  style?: React.CSSProperties;
}

/**
 * SpritesheetPlayer - Renders spritesheet frames synchronized with Remotion timeline
 * Uses CSS background-position technique for efficient frame display
 */
export const SpritesheetPlayer: React.FC<SpritesheetPlayerProps> = ({
  spritesheet,
  size = 330,
  style,
}) => {
  const frame = useCurrentFrame();
  const config = SPRITESHEET_CONFIG[spritesheet];

  // Guard against invalid spritesheet
  if (!config) {
    logger.error(`SpritesheetPlayer: Invalid spritesheet "${spritesheet}". Available: ${Object.keys(SPRITESHEET_CONFIG).join(', ')}`, 'SpritesheetPlayer');
    return null;
  }

  // Get the current spritesheet frame based on Remotion frame
  const spritesheetFrame = getSpritesheetFrame(frame, spritesheet);

  // Calculate scale factor to fit frame into display size
  const scale = size / Math.max(config.frameWidth, config.frameHeight);
  const scaledWidth = Math.round(config.frameWidth * scale);
  const scaledHeight = Math.round(config.frameHeight * scale);

  // Full spritesheet dimensions when scaled
  const sheetWidth = Math.round(config.frameWidth * config.columns * scale);
  const sheetHeight = Math.round(config.frameHeight * config.rows * scale);

  // Calculate background position based on current frame
  const col = spritesheetFrame % config.columns;
  const row = Math.floor(spritesheetFrame / config.columns);
  const backgroundPositionX = -col * scaledWidth;
  const backgroundPositionY = -row * scaledHeight;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
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
            backgroundImage: `url(${staticFile(config.url)})`,
            backgroundSize: `${sheetWidth}px ${sheetHeight}px`,
            backgroundPosition: `${backgroundPositionX}px ${backgroundPositionY}px`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'auto',
          }}
        />
      </div>
    </div>
  );
};

export default SpritesheetPlayer;
