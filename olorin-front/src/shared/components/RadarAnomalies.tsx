/**
 * RadarAnomalies Component
 * Feature: 004-new-olorin-frontend
 *
 * Renders animated anomaly blips and scanning ray.
 * Anomalies glow when the scanning ray passes over them.
 * Uses Olorin corporate color palette for risk visualization.
 */

import React, { useMemo } from 'react';
import { RadarAnomaly } from '@shared/types/radar.types';
import { RADAR_CENTER } from '@shared/utils/radarGeometry';

export interface RadarAnomaliesProps {
  anomalies: RadarAnomaly[];
  filterRiskLevel?: number | null;
  glowingAnomalies: Set<string>;
  onAnomalyClick?: (anomaly: RadarAnomaly) => void;
  showLabels?: boolean;
  centerX?: number;
  centerY?: number;
}

/**
 * Component rendering anomaly blips with glow effects
 */
export const RadarAnomalies: React.FC<RadarAnomaliesProps> = ({
  anomalies,
  filterRiskLevel = null,
  glowingAnomalies,
  onAnomalyClick,
  showLabels = false,
  centerX = RADAR_CENTER,
  centerY = RADAR_CENTER
}) => {
  // Filter anomalies by risk level if specified
  const filteredAnomalies = useMemo(() => {
    if (filterRiskLevel === null) return anomalies;
    return anomalies.filter((a) => a.riskLevel >= filterRiskLevel);
  }, [anomalies, filterRiskLevel]);

  return (
    <g className="radar-anomalies">
      {filteredAnomalies.map((anomaly) => {
        const { id, position, color, riskLevel, severity, type, detectedBy } = anomaly;
        const isGlowing = glowingAnomalies.has(id);

        // Size based on risk level
        const baseSize = 6 + (riskLevel / 100) * 4; // 6-10px
        const glowSize = baseSize * 2;

        // Info panel positioning (to the right of the blip)
        const panelX = position.x + baseSize + 15;
        const panelY = position.y - 25;
        const panelWidth = 140;
        const panelHeight = 50;

        return (
          <g
            key={id}
            className="anomaly-blip cursor-pointer"
            onClick={() => onAnomalyClick?.(anomaly)}
          >
            {/* Glow Effect (when scanning ray passes) */}
            {isGlowing && (
              <circle
                cx={position.x}
                cy={position.y}
                r={glowSize}
                fill={color}
                opacity={0.3}
                className="anomaly-glow"
              >
                <animate
                  attributeName="r"
                  values={`${glowSize};${glowSize * 1.5};${glowSize}`}
                  dur="0.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.3;0.1;0.3"
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Outer Ring */}
            <circle
              cx={position.x}
              cy={position.y}
              r={baseSize + 2}
              fill="none"
              stroke={color}
              strokeWidth={1}
              opacity={isGlowing ? 1 : 0.6}
              className="transition-opacity duration-200"
            />

            {/* Main Blip */}
            <circle
              cx={position.x}
              cy={position.y}
              r={baseSize}
              fill={color}
              opacity={isGlowing ? 1 : 0.8}
              className="transition-all duration-200"
            >
              {/* Pulse animation */}
              <animate
                attributeName="opacity"
                values={isGlowing ? '1;0.6;1' : '0.8;0.6;0.8'}
                dur={isGlowing ? '0.5s' : '2s'}
                repeatCount="indefinite"
              />
            </circle>

            {/* Critical Indicator (for high-risk anomalies) */}
            {riskLevel > 80 && (
              <g className="critical-indicator">
                <circle
                  cx={position.x}
                  cy={position.y - baseSize - 4}
                  r={3}
                  fill="#DC2626"
                  className="animate-pulse"
                />
                <text
                  x={position.x}
                  y={position.y - baseSize - 8}
                  textAnchor="middle"
                  fill="#DC2626"
                  fontSize="10"
                  fontWeight="bold"
                >
                  ⚠
                </text>
              </g>
            )}

            {/* Connection line from blip to info panel */}
            <line
              x1={position.x + baseSize}
              y1={position.y}
              x2={panelX}
              y2={panelY + panelHeight / 2}
              stroke={color}
              strokeWidth={1}
              opacity={0.4}
              strokeDasharray="2,2"
            />

            {/* Persistent Info Panel */}
            <g className="anomaly-info-panel">
              {/* Panel background */}
              <rect
                x={panelX}
                y={panelY}
                width={panelWidth}
                height={panelHeight}
                fill="rgba(11, 18, 33, 0.95)"
                stroke={color}
                strokeWidth={1.5}
                rx={4}
                opacity={0.95}
              />

              {/* Agent name */}
              <text
                x={panelX + 6}
                y={panelY + 12}
                fill="#22d3ee"
                fontSize="8"
                fontFamily="'Courier New', monospace"
                fontWeight="bold"
              >
                AGENT: {detectedBy.agent.substring(0, 12)}
              </text>

              {/* Tool used */}
              <text
                x={panelX + 6}
                y={panelY + 24}
                fill="#9CA3AF"
                fontSize="7"
                fontFamily="'Courier New', monospace"
              >
                TOOL: {detectedBy.tool.substring(0, 15)}
              </text>

              {/* Anomaly type */}
              <text
                x={panelX + 6}
                y={panelY + 36}
                fill={color}
                fontSize="7"
                fontFamily="'Courier New', monospace"
                fontWeight="600"
              >
                {type.substring(0, 18)}
              </text>

              {/* Risk level indicator */}
              <text
                x={panelX + 6}
                y={panelY + 46}
                fill={color}
                fontSize="7"
                fontFamily="'Courier New', monospace"
                opacity={0.8}
              >
                RISK: {riskLevel}/100
              </text>
            </g>

            {/* Tooltip on hover */}
            <title>
              {type}
              {'\n'}
              Agent: {detectedBy.agent}
              {'\n'}
              Tool: {detectedBy.tool}
              {'\n'}
              Risk: {riskLevel}/100 ({severity})
              {'\n'}
              Click for full details
            </title>
          </g>
        );
      })}
    </g>
  );
};

export interface ScanningRayProps {
  angle: number;
  maxRadius: number;
  isScanning: boolean;
  centerX?: number;
  centerY?: number;
}

/**
 * Scanning ray that rotates around the radar center
 * Heavier, slower design matching Olorin (30-second rotation)
 */
export const ScanningRay: React.FC<ScanningRayProps> = ({
  angle,
  maxRadius,
  isScanning,
  centerX = RADAR_CENTER,
  centerY = RADAR_CENTER
}) => {
  if (!isScanning) return null;

  const SWEEP_ANGLE = 30; // Degrees of trailing glow (matching Olorin)

  // Calculate the main ray endpoint
  const x = centerX + Math.cos(angle) * maxRadius;
  const y = centerY + Math.sin(angle) * maxRadius;

  // Calculate trailing sweep points
  const sweepAngleRad = (SWEEP_ANGLE * Math.PI) / 180;
  const trailX1 = centerX + Math.cos(angle - sweepAngleRad) * maxRadius;
  const trailY1 = centerY + Math.sin(angle - sweepAngleRad) * maxRadius;

  // Create gradient ID
  const gradientId = 'scanning-ray-gradient';

  return (
    <g className="scanning-ray">
      {/* Gradient definition */}
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Trailing glow sweep (wedge shape) - matches Olorin */}
      <path
        d={`M ${centerX} ${centerY} L ${trailX1} ${trailY1} A ${maxRadius} ${maxRadius} 0 0 1 ${x} ${y} Z`}
        fill={`url(#${gradientId})`}
        opacity={0.6}
        className="transition-opacity duration-300"
      />

      {/* Main ray line (bright leading edge) - HEAVIER */}
      <line
        x1={centerX}
        y1={centerY}
        x2={x}
        y2={y}
        stroke="#22d3ee"
        strokeWidth={2.5}
        opacity={0.9}
        style={{
          filter: 'drop-shadow(0 0 4px rgba(34, 211, 238, 0.8))'
        }}
        className="transition-opacity duration-300"
      />

      {/* Bright tip glow */}
      <circle
        cx={x}
        cy={y}
        r={4}
        fill="#22d3ee"
        opacity={0.8}
        style={{
          filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 1))'
        }}
      />
    </g>
  );
};

export default RadarAnomalies;
