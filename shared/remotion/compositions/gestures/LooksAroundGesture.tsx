/**
 * Looks Around Gesture Composition
 * Wizard looking around (idle behavior)
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const LooksAroundGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Eye sight line indicator moving
  const sightX = interpolate(frame, [0, 30, 60, 90], [40, 60, 60, 40]);
  const sightOpacity = interpolate(frame, [0, 15, 75, 90], [0, 0.5, 0.5, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="looks_around" size={330} />

      {/* Sight line indicator */}
      <div
        style={{
          position: 'absolute',
          top: '28%',
          left: `${sightX}%`,
          width: '30px',
          height: '2px',
          backgroundColor: '#60a5fa',
          opacity: sightOpacity,
          boxShadow: '0 0 6px #60a5fa',
        }}
      />

      {/* Curiosity sparkles */}
      {frame > 20 && frame < 70 && (
        <div
          style={{
            position: 'absolute',
            top: '25%',
            left: `${sightX + 5}%`,
            fontSize: '10px',
            color: '#60a5fa',
            opacity: interpolate(frame, [20, 30, 60, 70], [0, 1, 1, 0]),
            textShadow: '0 0 6px #60a5fa',
          }}
        >
          ✨
        </div>
      )}
    </AbsoluteFill>
  );
};

export default LooksAroundGesture;
