/**
 * RuneSwirl - Remotion Effect Component
 * Animated runic symbols swirling around wizard for magical effects
 */

import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface Rune {
  id: number;
  symbol: string;
  angle: number;
  radius: number;
  rotationSpeed: number;
  delay: number;
}

interface RuneSwirlProps {
  /** Center X position */
  centerX?: number;
  /** Center Y position */
  centerY?: number;
  /** Rune color */
  color?: string;
  /** Orbit radius */
  radius?: number;
  /** Number of runes */
  runeCount?: number;
  /** Animation duration in frames */
  duration?: number;
}

/**
 * Mystical rune symbols
 */
const RUNE_SYMBOLS = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ'];

/**
 * Generate rune configuration
 */
function generateRunes(count: number): Rune[] {
  const runes: Rune[] = [];

  for (let i = 0; i < count; i++) {
    runes.push({
      id: i,
      symbol: RUNE_SYMBOLS[i % RUNE_SYMBOLS.length],
      angle: (Math.PI * 2 * i) / count,
      radius: 60 + Math.random() * 40,
      rotationSpeed: 0.02 + Math.random() * 0.03,
      delay: Math.random() * 15,
    });
  }

  return runes;
}

/**
 * RuneSwirl component
 * Renders animated runic symbols orbiting around a center point
 */
export const RuneSwirl: React.FC<RuneSwirlProps> = ({
  centerX = 165,
  centerY = 280,
  color = '#a855f7',
  radius = 80,
  runeCount = 8,
  duration = 120,
}) => {
  const frame = useCurrentFrame();

  // Generate runes on first render
  const runes = React.useMemo(() => generateRunes(runeCount), [runeCount]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {runes.map((rune) => {
        // Orbit animation
        const orbitProgress = (frame - rune.delay) * rune.rotationSpeed;
        const x = centerX + Math.cos(rune.angle + orbitProgress) * radius;
        const y = centerY + Math.sin(rune.angle + orbitProgress) * (radius * 0.6); // Elliptical orbit

        // Fade in/out
        const opacity = interpolate(
          frame - rune.delay,
          [0, 10, duration - 20, duration],
          [0, 1, 1, 0],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }
        );

        // Rotation animation
        const rotation = interpolate(frame - rune.delay, [0, duration], [0, 360]);

        // Scale pulse
        const scale = interpolate(
          frame - rune.delay,
          [0, 15, 30, 45, 60, 75, 90, 105, 120],
          [1, 1.2, 1, 1.3, 1, 1.2, 1, 1.1, 1],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }
        );

        return (
          <div
            key={rune.id}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              fontSize: '24px',
              color: color,
              opacity,
              transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
              textShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
              fontFamily: 'serif',
              fontWeight: 'bold',
            }}
          >
            {rune.symbol}
          </div>
        );
      })}
    </div>
  );
};

export default RuneSwirl;
