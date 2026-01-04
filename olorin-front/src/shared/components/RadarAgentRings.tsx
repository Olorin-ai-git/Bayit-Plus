/**
 * RadarAgentRings Component
 * Feature: 004-new-olorin-frontend
 *
 * Renders concentric rings with agent labels positioned around the radar.
 * Each agent is shown as a text label positioned on its ring
 * with color-coded styling using Olorin corporate palette.
 */

import React from 'react';
import { RadarAgentRing } from '@shared/types/radar.types';
import { RADAR_CENTER } from '@shared/utils/radarGeometry';

export interface RadarAgentRingsProps {
  agents: RadarAgentRing[];
  showLabels?: boolean;
  centerX?: number;
  centerY?: number;
}

/**
 * Component rendering concentric agent rings with text labels only (no circles)
 */
export const RadarAgentRings: React.FC<RadarAgentRingsProps> = ({
  agents,
  showLabels = true,
  centerX = RADAR_CENTER,
  centerY = RADAR_CENTER
}) => {
  return (
    <g className="radar-agent-rings">
      {agents.map((agent) => {
        const { agentIndex, name, radius, color, status } = agent;

        // Skip rendering Risk Assessment Agent entirely
        if (name === 'Risk Assessment Agent' || name === 'Risk') {
          return null;
        }

        // Extract first word from agent name for label (e.g., "Device Fingerprint Agent" → "Device")
        const shortLabel = (name || '').split(' ')[0] || '';

        // Determine ring opacity based on status
        const ringOpacity = 0.2; // Subtle ring visibility
        const strokeWidth = 2; // Bold ring line

        // Calculate label position - distribute evenly around the ring
        // Start from top (12 o'clock) and go clockwise
        const angleOffset = (agentIndex * (360 / agents.length)) * (Math.PI / 180);
        const labelRadius = radius + 15; // Label positioned just outside the ring
        const labelX = centerX + Math.cos(angleOffset - Math.PI / 2) * labelRadius;
        const labelY = centerY + Math.sin(angleOffset - Math.PI / 2) * labelRadius;

        return (
          <g key={`agent-ring-${agentIndex}`} className="agent-ring">
            {/* Subtle Ring Circle (background) */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              opacity={ringOpacity}
              strokeDasharray="2,4"
              className="transition-all duration-300"
            />

            {/* Agent Label (only label, no circle) */}
            {showLabels && (
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                fontSize="11"
                fontWeight="600"
                fontFamily="'Courier New', monospace"
                className="select-none"
                opacity={0.8}
              >
                {shortLabel.toUpperCase()}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

export default RadarAgentRings;
