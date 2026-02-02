/**
 * Disagreement Gesture Composition
 * Wizard shaking head in disagreement
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const DisagreementGesture: React.FC = () => {
  const frame = useCurrentFrame();

  const xOpacity = interpolate(frame, [10, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const xScale = interpolate(frame, [10, 15, 20], [0.5, 1.3, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="disagreement" size={330} />

      {/* X mark */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '60%',
          fontSize: '40px',
          color: '#ef4444',
          opacity: xOpacity,
          transform: `translate(-50%, -50%) scale(${xScale})`,
          textShadow: '0 0 20px #ef4444',
          fontWeight: 'bold',
        }}
      >
        ✕
      </div>

      {/* Negative glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
          opacity: 0.6,
          filter: 'blur(25px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default DisagreementGesture;
