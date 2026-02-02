/**
 * Shifts Weight Gesture Composition
 * Wizard shifting weight (idle behavior)
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const ShiftsWeightGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Subtle sway glow
  const glowX = interpolate(frame, [0, 30, 60], [48, 52, 48]);
  const glowOpacity = interpolate(frame, [0, 30, 60], [0.3, 0.5, 0.3]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="shifts_weight" size={330} />

      {/* Subtle movement indicator */}
      <div
        style={{
          position: 'absolute',
          top: '70%',
          left: `${glowX}%`,
          transform: 'translate(-50%, -50%)',
          width: '40px',
          height: '8px',
          backgroundColor: 'rgba(148, 163, 184, 0.3)',
          borderRadius: '50%',
          opacity: glowOpacity,
          filter: 'blur(8px)',
        }}
      />
    </AbsoluteFill>
  );
};

export default ShiftsWeightGesture;
