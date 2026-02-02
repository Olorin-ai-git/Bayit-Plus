/**
 * Clarification Gesture Composition
 * Wizard asking for clarification with question indicator
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const ClarificationGesture: React.FC = () => {
  const frame = useCurrentFrame();

  const questionOpacity = interpolate(frame, [10, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const questionScale = interpolate(frame, [10, 20, 30], [0.8, 1.2, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="clarification" size={330} />

      {/* Question mark */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '60%',
          fontSize: '36px',
          color: '#f59e0b',
          opacity: questionOpacity,
          transform: `translate(-50%, -50%) scale(${questionScale})`,
          textShadow: '0 0 15px #f59e0b',
          fontWeight: 'bold',
        }}
      >
        ?
      </div>

      {/* Attention pulse */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '60%',
          transform: 'translate(-50%, -50%)',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '2px solid #f59e0b',
          opacity: interpolate(frame, [15, 25, 35], [0, 0.6, 0]),
        }}
      />
    </AbsoluteFill>
  );
};

export default ClarificationGesture;
