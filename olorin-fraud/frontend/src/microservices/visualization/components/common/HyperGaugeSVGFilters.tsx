/**
 * SVG Filter Definitions for HyperGauge Component
 *
 * Extracted from HyperGauge.tsx for file size compliance (<200 lines per file).
 * Contains all SVG filter and gradient definitions for realistic gauge effects.
 *
 * NO HARDCODED VALUES - Color values passed as props from configuration.
 */

import React from 'react';

export interface HyperGaugeSVGFiltersProps {
  /** Primary gauge color (hex) */
  color: string;
}

/**
 * SVG Filter and Gradient Definitions Component
 *
 * Provides reusable SVG definitions for:
 * - Noise texture filter
 * - Outer glow filter
 * - Bloom filter for realistic shine
 * - Needle glow filter
 * - Gradient definitions (bezel, track, fill, glass)
 *
 * All filters are defined once in <defs> and referenced by ID.
 */
export const HyperGaugeSVGFilters: React.FC<HyperGaugeSVGFiltersProps> = React.memo(
  ({ color }) => {
    return (
      <defs>
        {/* Noise filter for texture */}
        <filter id="noise" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="2"
            stitchTiles="stitch"
            result="n"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.05" />
          </feComponentTransfer>
        </filter>

        {/* Outer glow filter */}
        <filter id="outer-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Bloom filter for realistic shine */}
        <filter id="bloom" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
          />
          <feBlend in="SourceGraphic" mode="screen" />
        </filter>

        {/* Needle glow filter */}
        <filter id="needle-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="2.2"
            floodColor={color}
            floodOpacity="0.95"
          />
        </filter>

        {/* Bezel gradient (radial) */}
        <radialGradient id="bezelGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="55%" stopColor="#222a3a" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.85" />
        </radialGradient>

        {/* Track gradient (linear) */}
        <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0b1220" />
          <stop offset="100%" stopColor="#101a2e" />
        </linearGradient>

        {/* Fill gradient (linear, uses dynamic color) */}
        <linearGradient id="fillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.95" />
        </linearGradient>

        {/* Glass effect gradient (linear) */}
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>
      </defs>
    );
  }
);

HyperGaugeSVGFilters.displayName = 'HyperGaugeSVGFilters';
