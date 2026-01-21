/**
 * HyperGauge Ticks Component
 * Task: T026 (extracted from HyperGauge.tsx)
 * Feature: 002-visualization-microservice
 *
 * Renders tick marks and optional numeric labels for gauge dial.
 */

import React from 'react';
import { TickMark } from './HyperGaugeTypes';

export interface HyperGaugeTicksProps {
  /** Array of tick mark definitions */
  ticks: TickMark[];

  /** Gauge size for font sizing */
  size: number;
}

/**
 * Renders tick marks with optional numeric labels
 * Displays both major (thick) and minor (thin) tick marks
 */
export const HyperGaugeTicks: React.FC<HyperGaugeTicksProps> = ({ ticks, size }) => {
  return (
    <>
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#a9b5cc"
            strokeWidth={t.thick ? 2 : 1}
            opacity={t.thick ? 0.9 : 0.6}
          />
          {t.label && (
            <text
              x={t.label.x}
              y={t.label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.06}
              fill="#c8d3e6"
              opacity={0.75}
            >
              {t.label.text}
            </text>
          )}
        </g>
      ))}
    </>
  );
};

HyperGaugeTicks.displayName = 'HyperGaugeTicks';
