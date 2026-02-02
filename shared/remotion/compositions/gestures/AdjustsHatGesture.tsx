/**
 * Adjusts Hat Gesture Composition
 * Wizard adjusting hat (idle behavior)
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const AdjustsHatGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Sparkles when adjusting hat
  const sparkleOpacity = interpolate(frame, [15, 20, 30], [0, 1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="adjusts_hat" size={330} />

      {/* Hat adjustment sparkles */}
      {[0, 1, 2].map((i) => {
        const delay = 15 + i * 3;
        const opacity = interpolate(frame, [delay, delay + 3, delay + 8], [0, 1, 0]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '18%',
              left: `${48 + i * 4}%`,
              fontSize: '12px',
              color: '#a855f7',
              opacity,
              textShadow: '0 0 8px #a855f7',
            }}
          >
            ✨
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export default AdjustsHatGesture;
