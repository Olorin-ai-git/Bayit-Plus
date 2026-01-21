/**
 * HyperGauge Component - SVG-based Circular Gauge with Needle
 * Task: T019
 * Feature: 012-agents-risk-gauges
 *
 * High-fidelity circular gauge with:
 * - Spring needle animation (useSpringValue hook integration)
 * - Risk zone visualization (colored arcs for thresholds)
 * - Pulse animation for severe warnings (risk ≥ 90)
 * - Glass/bezel realistic effects
 * - Continuous arc fill option
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSpringValue } from '@shared/hooks/useSpringValue';
import { RiskZone } from '@shared/types/AgentRiskGauges';

// ========== Types ==========

export interface HyperGaugeProps {
  /** Gauge size in pixels (width and height) */
  size?: number;

  /** Current value to display */
  value: number;

  /** Maximum value on the scale */
  max: number;

  /** Label text */
  label: string;

  /** Optional subtitle text */
  subtitle?: string;

  /** Start angle in degrees (default: -120) */
  startAngle?: number;

  /** End angle in degrees (default: 120) */
  endAngle?: number;

  /** Primary color for gauge (hex) */
  color: string;

  /** Show risk zone arcs */
  showZones?: boolean;

  /** Risk zone definitions */
  zones?: RiskZone[];

  /** Custom value formatter function */
  valueFormatter?: (value: number) => string;

  /** Enable realistic glass/bezel effects */
  realistic?: boolean;

  /** Show tick mark numbers */
  showNumbers?: boolean;

  /** Enable continuous arc fill from start to current value */
  continuousFill?: boolean;

  /** Enable pulse animation (for severe warnings) */
  warnPulse?: boolean;

  /** Animation duration in milliseconds (for ease mode) */
  animationMs?: number;

  /** Needle animation mode: 'spring' (physics-based) or 'ease' (easing function) */
  needleMode?: 'spring' | 'ease';
}

interface TickMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thick: boolean;
  label?: {
    x: number;
    y: number;
    text: string;
  };
}

// ========== Helper Functions ==========

/**
 * Convert value to angle in degrees
 */
function valueToAngle(value: number, max: number, start: number, end: number): number {
  const clamped = Math.max(0, Math.min(value, max));
  const t = max === 0 ? 0 : clamped / max;
  return start + (end - start) * t;
}

/**
 * Convert polar coordinates to Cartesian
 */
function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: cx + Math.cos(rad) * r,
    y: cy + Math.sin(rad) * r,
  };
}

/**
 * Generate SVG arc path
 */
function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

/**
 * Simple ease animation hook (fallback for needleMode='ease')
 */
function useAnimatedValue(target: number, durationMs: number = 900): number {
  const [v, setV] = useState(target);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(target);
  const toRef = useRef(target);

  useEffect(() => {
    fromRef.current = v;
    toRef.current = target;
    startRef.current = null;

    let raf = 0;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / durationMs);
      const eased = easeOutCubic(p);
      setV(fromRef.current + (toRef.current - fromRef.current) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return v;
}

// ========== Component ==========

/**
 * T019: HyperGauge - SVG-based circular gauge with needle
 *
 * Features:
 * - Spring needle animation for realistic motion
 * - Risk zone arcs with customizable colors
 * - Pulse animation for severe warnings
 * - Glass/bezel effects
 * - Continuous arc fill
 * - Customizable tick marks
 */
export const HyperGauge: React.FC<HyperGaugeProps> = React.memo(({
  size = 280,
  value,
  max,
  label,
  subtitle,
  startAngle = -120,
  endAngle = 120,
  color,
  showZones = false,
  zones = [],
  valueFormatter,
  realistic = true,
  showNumbers = true,
  continuousFill = false,
  warnPulse = false,
  animationMs = 900,
  needleMode = 'spring',
}) => {
  // Validate and sanitize inputs to prevent NaN errors
  const validSize = Number.isFinite(size) && size > 0 ? size : 280;
  const validValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const validMax = Number.isFinite(max) && max > 0 ? max : 100;
  const validStartAngle = Number.isFinite(startAngle) ? startAngle : -120;
  const validEndAngle = Number.isFinite(endAngle) ? endAngle : 120;

  // Call all hooks unconditionally to follow React Hook rules
  const springValue = useSpringValue(validValue);
  const animatedValue = useAnimatedValue(validValue, animationMs);
  
  // Select the appropriate animated value based on mode
  const animValue = needleMode === 'spring' ? springValue : animatedValue;

  // Geometry calculations - use validated values
  const cx = validSize / 2;
  const cy = validSize / 2;
  const radius = validSize * 0.4;
  const needleLen = radius * 0.96;
  const currentAngle = valueToAngle(animValue, validMax, validStartAngle, validEndAngle);
  const angleRad = (currentAngle - 90) * (Math.PI / 180);
  const nx = cx + Math.cos(angleRad) * needleLen;
  const ny = cy + Math.sin(angleRad) * needleLen;

  // Generate tick marks
  const ticks = useMemo<TickMark[]>(() => {
    const totalTicks = 40; // richer dial
    const items: TickMark[] = [];

    for (let i = 0; i <= totalTicks; i++) {
      const t = i / totalTicks;
      const a = validStartAngle + (validEndAngle - validStartAngle) * t;
      const rad = (a - 90) * (Math.PI / 180);
      const thick = i % 4 === 0;
      const r1 = radius * (thick ? 1.1 : 1.05);
      const r2 = radius * (thick ? 0.9 : 0.96);
      const x1 = cx + Math.cos(rad) * r1;
      const y1 = cy + Math.sin(rad) * r1;
      const x2 = cx + Math.cos(rad) * r2;
      const y2 = cy + Math.sin(rad) * r2;

      const item: TickMark = { x1, y1, x2, y2, thick };

      if (showNumbers && thick) {
        const rl = radius * 1.18;
        const lx = cx + Math.cos(rad) * rl;
        const ly = cy + Math.sin(rad) * rl;
        const markVal = Math.round(validMax * t);
        item.label = { x: lx, y: ly, text: String(markVal) };
      }

      items.push(item);
    }

    return items;
  }, [validStartAngle, validEndAngle, radius, cx, cy, validMax, showNumbers]);

  const display = valueFormatter ? valueFormatter(validValue) : `${Math.round(validValue)}`;
  const fillPath = arcPath(cx, cy, radius, validStartAngle, currentAngle);

  return (
    <div
      className={`relative ${warnPulse ? 'hyper-pulse' : ''}`}
      style={{ width: validSize, height: validSize }}
    >
      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes hyperPulse {
          0% { box-shadow: 0 0 0 0 ${color}55, inset 0 0 36px ${color}22; }
          70% { box-shadow: 0 0 40px 16px ${color}00, inset 0 0 36px ${color}22; }
          100% { box-shadow: 0 0 0 0 ${color}00, inset 0 0 36px ${color}22; }
        }
        .hyper-pulse { animation: hyperPulse 1.5s ease-out infinite; border-radius: 9999px; }
      `}</style>

      <svg width={validSize} height={validSize} viewBox={`0 0 ${validSize} ${validSize}`}>
        <defs>
          {/* Noise filter */}
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

          {/* Bloom filter */}
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

          {/* Gradients */}
          <radialGradient id="bezelGrad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="55%" stopColor="#222a3a" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.85" />
          </radialGradient>

          <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0b1220" />
            <stop offset="100%" stopColor="#101a2e" />
          </linearGradient>

          <linearGradient id="fillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Background & track */}
        <circle cx={cx} cy={cy} r={validSize * 0.49} fill="#070b14" />
        <circle
          cx={cx}
          cy={cy}
          r={validSize * 0.49}
          fill="url(#bezelGrad)"
          filter={realistic ? 'url(#bloom)' : undefined}
        />
        <circle cx={cx} cy={cy} r={validSize * 0.49} filter="url(#noise)" />
        <path
          d={arcPath(cx, cy, radius, validStartAngle, validEndAngle)}
          stroke="url(#trackGrad)"
          strokeWidth={validSize * 0.1}
          fill="none"
          opacity={0.95}
        />

        {/* Continuous value fill */}
        {continuousFill && (
          <path
            d={fillPath}
            stroke="url(#fillGrad)"
            strokeWidth={validSize * 0.08}
            strokeLinecap="round"
            fill="none"
            filter="url(#outer-glow)"
          />
        )}

        {/* Risk zones */}
        {showZones &&
          zones.map((z, i) => (
            <path
              key={i}
              d={arcPath(
                cx,
                cy,
                radius,
                valueToAngle(z.start, validMax, validStartAngle, validEndAngle),
                valueToAngle(z.end, validMax, validStartAngle, validEndAngle)
              )}
              stroke={z.color}
              strokeWidth={validSize * 0.065}
              strokeLinecap="round"
              fill="none"
              opacity={0.6}
            />
          ))}

        {/* Ticks */}
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
                fontSize={validSize * 0.06}
                fill="#c8d3e6"
                opacity={0.75}
              >
                {t.label.text}
              </text>
            )}
          </g>
        ))}

        {/* Needle */}
        <g filter="url(#needle-glow)">
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth={3.5} />
          <circle cx={cx} cy={cy} r={7} fill={color} />
        </g>
        <circle cx={cx} cy={cy} r={11} fill="#0b1220" stroke="#2a3347" strokeWidth={2.5} />
        <circle cx={cx} cy={cy} r={5} fill="#0b1220" stroke="#435068" strokeWidth={1.5} />

        {/* Readouts */}
        <text
          x={cx}
          y={cy + validSize * 0.22}
          textAnchor="middle"
          fontSize={validSize * 0.1}
          fontWeight={800}
          fill={color}
          filter="url(#outer-glow)"
        >
          {display}
        </text>
        <text
          x={cx}
          y={cy + validSize * 0.32}
          textAnchor="middle"
          fontSize={validSize * 0.08}
          fill="#b6c2d9"
          opacity={0.85}
        >
          {label}
        </text>
        {subtitle && (
          <text
            x={cx}
            y={cy + validSize * 0.39}
            textAnchor="middle"
            fontSize={validSize * 0.05}
            fill="#8aa0c5"
            opacity={0.8}
          >
            {subtitle}
          </text>
        )}

        {/* Glass effects */}
        {realistic && (
          <g>
            <path
              d={`M ${cx - radius * 1.2} ${cy - radius * 0.9} Q ${cx} ${
                cy - radius * 1.4
              }, ${cx + radius * 1.2} ${cy - radius * 0.9}`}
              fill="none"
              stroke="url(#glass)"
              strokeWidth={validSize * 0.08}
              opacity={0.65}
            />
            <path
              d={`M ${cx - radius * 1.1} ${cy + radius * 1.1} Q ${cx} ${
                cy + radius * 1.45
              }, ${cx + radius * 1.1} ${cy + radius * 1.1}`}
              fill="none"
              stroke="url(#glass)"
              strokeWidth={validSize * 0.04}
              opacity={0.25}
            />
          </g>
        )}
      </svg>

      <div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 42px ${color}33, inset 0 0 36px ${color}22` }}
      />
    </div>
  );
});

HyperGauge.displayName = 'HyperGauge';
