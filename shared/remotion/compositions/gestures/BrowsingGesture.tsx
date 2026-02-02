/**
 * Browsing Gesture Composition
 * Wizard searching/browsing with scanning lines effect
 */

import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';

/**
 * Browsing gesture with scanning/searching effects
 * Duration: ~0.83 seconds (5 frames at 6fps = 50 frames at 60fps)
 */
export const BrowsingGesture: React.FC = () => {
  const frame = useCurrentFrame();

  // Scanning line effect
  const scanLineY = interpolate(frame, [0, 50], [20, 80], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scanLineOpacity = interpolate(
    frame,
    [0, 10, 40, 50],
    [0, 0.6, 0.6, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Data particles flowing
  const dataFlow1 = interpolate(frame, [0, 50], [100, 0]);
  const dataFlow2 = interpolate(frame, [5, 50], [100, 0]);
  const dataFlow3 = interpolate(frame, [10, 50], [100, 0]);

  // Pulsating search indicator
  const searchPulse = interpolate(
    frame,
    [0, 12, 25, 37, 50],
    [0.3, 1, 0.3, 1, 0.3]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
      }}
    >
      {/* Spritesheet animation */}
      <SpritesheetPlayer spritesheet="browsing" size={330} />

      {/* Scanning line */}
      <div
        style={{
          position: 'absolute',
          top: `${scanLineY}%`,
          left: '40%',
          width: '40%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
          opacity: scanLineOpacity,
          boxShadow: '0 0 8px #10b981, 0 0 16px #10b981',
        }}
      />

      {/* Data flow particles */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          right: '20%',
          pointerEvents: 'none',
        }}
      >
        {[dataFlow1, dataFlow2, dataFlow3].map((flow, i) => {
          const opacity = interpolate(flow, [100, 50, 0], [0, 1, 0]);

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${i * 25}px`,
                right: `${flow}px`,
                width: '4px',
                height: '4px',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                opacity,
                boxShadow: '0 0 6px #10b981',
              }}
            />
          );
        })}
      </div>

      {/* Search indicator pulse */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '60%',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: '2px solid #10b981',
          opacity: searchPulse,
          boxShadow: `0 0 ${10 * searchPulse}px #10b981`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '8px',
            height: '8px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            opacity: searchPulse,
          }}
        />
      </div>

      {/* Ambient tech glow */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          opacity: 0.6,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default BrowsingGesture;
