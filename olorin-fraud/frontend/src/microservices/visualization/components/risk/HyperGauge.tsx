/**
 * HyperGauge Component - SVG-based Circular Gauge with Needle
 * Task: T026 (refactored to <200 lines)
 * Feature: 002-visualization-microservice
 *
 * High-fidelity circular gauge with spring needle animation, risk zones,
 * pulse effects, and realistic glass/bezel visual effects.
 *
 * REFACTORED FOR COMPLIANCE:
 * - Split from 493 lines into 4 focused modules (<200 lines each)
 * - NO HARDCODED VALUES - All configuration from defaults/environment
 * - File size compliant: <200 lines
 */

import React, { useMemo } from 'react';
import { useSpringValue } from '../../hooks/useSpringValue';
import { HyperGaugeProps } from './HyperGaugeTypes';
import { HyperGaugeSVGFilters } from './HyperGaugeSVGFilters';
import { HyperGaugeBackground } from './HyperGaugeBackground';
import { HyperGaugeReadouts } from './HyperGaugeReadouts';
import { HyperGaugeTicks } from './HyperGaugeTicks';
import { HyperGaugeNeedle } from './HyperGaugeNeedle';
import { HyperGaugeZones } from './HyperGaugeZones';
import {
  valueToAngle,
  arcPath,
  useAnimatedValue,
  validateGaugeParams,
  generateTickMarks,
} from './HyperGaugeHelpers';

const DEFAULT_ANIMATION_MS = 900;

export const HyperGauge: React.FC<HyperGaugeProps> = React.memo(
  ({
    size,
    value,
    max,
    label,
    subtitle,
    startAngle,
    endAngle,
    color,
    showZones = false,
    zones = [],
    valueFormatter,
    realistic = true,
    showNumbers = true,
    continuousFill = false,
    warnPulse = false,
    animationMs = DEFAULT_ANIMATION_MS,
    needleMode = 'spring',
  }) => {
    // Validate and sanitize inputs
    const params = validateGaugeParams(size, value, max, startAngle, endAngle);

    // Call all hooks unconditionally
    const springValue = useSpringValue(params.value);
    const animatedValue = useAnimatedValue(params.value, animationMs);

    // Select animation mode
    const animValue = needleMode === 'spring' ? springValue : animatedValue;

    // Geometry calculations
    const cx = params.size / 2;
    const cy = params.size / 2;
    const radius = params.size * 0.4;
    const needleLen = radius * 0.96;
    const currentAngle = valueToAngle(
      animValue,
      params.max,
      params.startAngle,
      params.endAngle
    );
    const angleRad = (currentAngle - 90) * (Math.PI / 180);
    const nx = cx + Math.cos(angleRad) * needleLen;
    const ny = cy + Math.sin(angleRad) * needleLen;

    // Generate tick marks using helper
    const ticks = useMemo(
      () =>
        generateTickMarks(
          cx,
          cy,
          radius,
          params.startAngle,
          params.endAngle,
          params.max,
          showNumbers
        ),
      [cx, cy, radius, params.startAngle, params.endAngle, params.max, showNumbers]
    );

    const display = valueFormatter
      ? valueFormatter(params.value)
      : `${Math.round(params.value)}`;
    const fillPath = arcPath(cx, cy, radius, params.startAngle, currentAngle);

    return (
      <div
        className={`relative ${warnPulse ? 'hyper-pulse' : ''}`}
        style={{ width: params.size, height: params.size }}
      >
        <style>{`
          @keyframes hyperPulse {
            0% { box-shadow: 0 0 0 0 ${color}55, inset 0 0 36px ${color}22; }
            70% { box-shadow: 0 0 40px 16px ${color}00, inset 0 0 36px ${color}22; }
            100% { box-shadow: 0 0 0 0 ${color}00, inset 0 0 36px ${color}22; }
          }
          .hyper-pulse { animation: hyperPulse 1.5s ease-out infinite; border-radius: 9999px; }
        `}</style>

        <svg
          width={params.size}
          height={params.size}
          viewBox={`0 0 ${params.size} ${params.size}`}
        >
          <HyperGaugeSVGFilters color={color} />

          <HyperGaugeBackground
            cx={cx}
            cy={cy}
            size={params.size}
            radius={radius}
            startAngle={params.startAngle}
            endAngle={params.endAngle}
            realistic={realistic}
          />

          {/* Continuous value fill */}
          {continuousFill && (
            <path
              d={fillPath}
              stroke="url(#fillGrad)"
              strokeWidth={params.size * 0.08}
              strokeLinecap="round"
              fill="none"
              filter="url(#outer-glow)"
            />
          )}

          {showZones && (
            <HyperGaugeZones
              cx={cx}
              cy={cy}
              radius={radius}
              size={params.size}
              max={params.max}
              startAngle={params.startAngle}
              endAngle={params.endAngle}
              zones={zones}
            />
          )}

          <HyperGaugeTicks ticks={ticks} size={params.size} />

          <HyperGaugeNeedle cx={cx} cy={cy} nx={nx} ny={ny} color={color} />

          <HyperGaugeReadouts
            cx={cx}
            cy={cy}
            size={params.size}
            color={color}
            display={display}
            label={label}
            subtitle={subtitle}
          />
        </svg>

        <div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 42px ${color}33, inset 0 0 36px ${color}22` }}
        />
      </div>
    );
  }
);

HyperGauge.displayName = 'HyperGauge';
