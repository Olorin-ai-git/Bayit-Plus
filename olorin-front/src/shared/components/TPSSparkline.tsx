/**
 * TPSSparkline Component - Tools Per Second Sparkline Chart
 *
 * Displays a mini SVG line chart showing the last 30 samples of tools/sec metric.
 * Provides visual history of investigation activity trends.
 *
 * Features:
 * - SVG-based line chart with gradient fill
 * - Responsive scaling (0-40 tools/sec range)
 * - Background grid lines for reference
 * - Smooth polyline rendering
 * - Configurable colors and dimensions
 *
 * Performance:
 * - Pure SVG rendering (no canvas)
 * - Minimal re-renders via React.memo
 * - Static gradient definitions
 */

import React from 'react';

export interface TPSSparklineProps {
  /** Array of tools/sec values (0-40 range) */
  data?: number[];
  /** Canvas width in pixels */
  width?: number;
  /** Canvas height in pixels */
  height?: number;
  /** Line color (hex) */
  lineColor?: string;
  /** Enable gradient fill under line */
  fill?: boolean;
}

/**
 * TPSSparkline - Mini line chart for tools/sec history
 */
export const TPSSparkline: React.FC<TPSSparklineProps> = ({
  data = [],
  width = 900,
  height = 56,
  lineColor = '#34f3a0',
  fill = true,
}) => {
  // Handle empty data
  if (data.length === 0) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#666"
          fontSize={12}
        >
          No data available
        </text>
      </svg>
    );
  }

  const n = data.length;
  const stepX = width / Math.max(1, n - 1);

  /**
   * Map tools/sec value (0-40) to y coordinate
   * Leaves 3px padding at top and bottom
   */
  const mapY = (value: number): number => {
    const clampedValue = Math.max(0, Math.min(40, value));
    return height - (clampedValue / 40) * (height - 6) - 3;
  };

  // Generate SVG polyline points
  const points = data
    .map((value, index) => `${index * stepX},${mapY(value)}`)
    .join(' ');

  // Background grid line positions (0%, 25%, 50%, 75%, 100%)
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline-chart"
    >
      {/* Gradient definition for fill area */}
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Background grid lines */}
      <g opacity="0.2" stroke="#1b2a44" strokeWidth="1">
        {gridLines.map((fraction, index) => (
          <line
            key={index}
            x1="0"
            y1={height * fraction}
            x2={width}
            y2={height * fraction}
          />
        ))}
      </g>

      {/* Fill area under the line */}
      {fill && data.length > 0 && (
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill="url(#sparkFill)"
        />
      )}

      {/* Sparkline path */}
      {data.length > 0 && (
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};

// Memoize to prevent unnecessary re-renders
export default React.memo(TPSSparkline);
