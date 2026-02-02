/**
 * Warning Gesture Composition
 * Wizard warning with alert indicators
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

export const WarningGesture: React.FC = () => {
  const frame = useCurrentFrame();

  const pulseOpacity = interpolate(frame, [0, 15, 30, 45], [0.4, 1, 0.4, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <SpritesheetPlayer spritesheet="warning" size={330} />

      {/* Warning triangle */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 0,
          height: 0,
          borderLeft: '20px solid transparent',
          borderRight: '20px solid transparent',
          borderBottom: '35px solid #ef4444',
          opacity: pulseOpacity,
          filter: 'drop-shadow(0 0 10px #ef4444)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '-2px',
            fontSize: '20px',
            color: '#fff',
            fontWeight: 'bold',
          }}
        >
          !
        </div>
      </div>

      {/* Warning glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
          opacity: pulseOpacity * 0.7,
          filter: 'blur(25px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default WarningGesture;
