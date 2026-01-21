/**
 * RadarNeedle Component
 * Feature: 007-progress-wizard-page
 *
 * Displays a rotating needle on the radar to indicate overall risk level.
 * Needle rotates from 0° (low risk) to 360° (high risk).
 * Uses smooth animations and glow effects for visual feedback.
 */

import React from 'react';

export interface RadarNeedleProps {
  /**
   * Overall risk level (0-100)
   * Used for color when not scanning
   */
  riskLevel: number;

  /**
   * Current scan angle in radians (0-2π)
   * When provided and isScanning=true, needle rotates continuously
   */
  scanAngle?: number;

  /**
   * Whether investigation is actively scanning
   * If true, uses scanAngle for continuous rotation
   */
  isScanning?: boolean;

  /**
   * Radar center X coordinate
   */
  centerX: number;

  /**
   * Radar center Y coordinate
   */
  centerY: number;

  /**
   * Needle length (radius)
   */
  length: number;

  /**
   * Whether to animate the needle
   */
  animate?: boolean;
}

/**
 * Maps risk level (0-100) to angle in degrees
 * 0 = low risk (pointing up, -90°)
 * 100 = critical risk (full rotation, 270°)
 */
function riskToAngle(riskLevel: number): number {
  // Start at -90° (pointing up) and rotate 360° clockwise
  return -90 + (riskLevel / 100) * 360;
}

/**
 * Gets color based on risk level
 */
function getRiskColor(riskLevel: number): string {
  if (riskLevel < 25) return '#10B981'; // Green (low)
  if (riskLevel < 50) return '#F59E0B'; // Amber (medium)
  if (riskLevel < 75) return '#A855F7'; // Purple (high)
  return '#EF4444'; // Red (critical)
}

/**
 * Converts radians to degrees
 */
function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Radar needle component
 */
export const RadarNeedle: React.FC<RadarNeedleProps> = ({
  riskLevel,
  scanAngle,
  isScanning = false,
  centerX,
  centerY,
  length,
  animate = true
}) => {
  // When scanning, use continuous rotation from scanAngle
  // When not scanning, show static angle based on risk level
  const angle = isScanning && scanAngle !== undefined
    ? radiansToDegrees(scanAngle) - 90  // Convert radians to degrees, -90 to start from top
    : riskToAngle(riskLevel);

  const color = getRiskColor(riskLevel);

  // Draw needle pointing straight up (0°), then rotate the whole group
  // This allows CSS transform to work smoothly
  const baseWidth = 6;

  // Needle points upward from center
  const tipX = centerX;
  const tipY = centerY - length;
  const base1X = centerX - baseWidth / 2;
  const base1Y = centerY;
  const base2X = centerX + baseWidth / 2;
  const base2Y = centerY;

  // Debug logging removed to prevent performance issues
  // Uncomment for debugging if needed:
  // console.log(`🎯 [RadarNeedle] State:`, { ... });

  return (
    <g className="radar-needle">
      {/* Needle glow effect */}
      <defs>
        <filter id="needle-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Rotating needle group */}
      <g
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: `${centerX}px ${centerY}px`,
          // Use CSS transition only for static mode, not during continuous scanning
          transition: (animate && !isScanning) ? 'transform 0.8s ease-out' : 'none'
        }}
      >
        {/* Needle triangle */}
        <polygon
          points={`${tipX},${tipY} ${base1X},${base1Y} ${base2X},${base2Y}`}
          fill={color}
          opacity={0.9}
          filter="url(#needle-glow)"
        />
      </g>

      {/* Center pivot point (non-rotating) */}
      <circle
        cx={centerX}
        cy={centerY}
        r={8}
        fill={color}
        opacity={0.95}
      />

      {/* Inner pivot */}
      <circle
        cx={centerX}
        cy={centerY}
        r={4}
        fill="#1a1a1a"
        opacity={0.8}
      />

      {/* Risk level text label (non-rotating) */}
      <text
        x={centerX}
        y={centerY - length - 20}
        textAnchor="middle"
        fill={color}
        fontSize="12"
        fontWeight="bold"
        fontFamily="'Courier New', monospace"
        style={{
          transition: animate ? 'fill 0.3s ease-out' : 'none'
        }}
      >
        RISK: {riskLevel.toFixed(0)}%
      </text>
    </g>
  );
};

export default RadarNeedle;
