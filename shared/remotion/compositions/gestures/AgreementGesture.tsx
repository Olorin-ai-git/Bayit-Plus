/**
 * Agreement Gesture Composition
 * Wizard nodding in agreement
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const AgreementGesture: React.FC = () => {
  const frame = useCurrentFrame();

  const checkOpacity = interpolate(frame, [10, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const checkScale = interpolate(frame, [10, 15, 20], [0.5, 1.3, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="agreement" size={330} />

      {/* Check mark */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '60%',
          fontSize: '40px',
          color: '#22c55e',
          opacity: checkOpacity,
          transform: `translate(-50%, -50%) scale(${checkScale})`,
          textShadow: '0 0 20px #22c55e',
          fontWeight: 'bold',
        }}
      >
        ✓
      </div>

      {/* Positive glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)',
          opacity: 0.6,
          filter: 'blur(25px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default AgreementGesture;
