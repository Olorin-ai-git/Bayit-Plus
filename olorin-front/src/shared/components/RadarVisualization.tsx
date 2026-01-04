/**
 * RadarVisualization Component
 * Feature: 004-new-olorin-frontend
 *
 * Main SVG radar visualization showing agents, tools, and anomalies.
 * Integrates agent rings, tool ticks, anomaly blips, and scanning ray animation.
 * Uses Olorin corporate color palette.
 * Includes anomaly details modal (Feature: 005-polling-and-persistence).
 */

import React, { useMemo, useState, useEffect } from 'react';
import type { RadarVisualizationState, RadarAnomaly } from '@shared/types/radar.types';
import { useRadarAnimation } from '@shared/hooks/useRadarAnimation';
import { RadarAgentRings } from './RadarAgentRings';
import { RadarAnomalies, ScanningRay } from './RadarAnomalies';
import { AnomalyDetailsModal } from './AnomalyDetailsModal';
import { RadarNeedle } from './RadarNeedle';
import { RADAR_SIZE, RADAR_CENTER } from '@shared/utils/radarGeometry';

export interface RadarVisualizationProps {
  state: RadarVisualizationState;
  onAnomalySelected?: (anomaly: RadarAnomaly) => void;
  onToggleScanning?: () => void;
  onToggleLabels?: () => void;
  className?: string;
}

/**
 * Main radar visualization component
 */
export const RadarVisualization: React.FC<RadarVisualizationProps> = ({
  state,
  onAnomalySelected,
  onToggleScanning,
  onToggleLabels,
  className = ''
}) => {
  const { agents = [], anomalies = [], uiState = { isScanning: false, showLabels: true }, stats = {} } = state || {};

  // Modal state management for anomaly details
  const [selectedAnomaly, setSelectedAnomaly] = useState<RadarAnomaly | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle anomaly click - open modal with details
  const handleAnomalyClick = (anomaly: RadarAnomaly) => {
    setSelectedAnomaly(anomaly);
    setIsModalOpen(true);
    // Also call the external callback if provided
    onAnomalySelected?.(anomaly);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    // Keep selectedAnomaly for animation purposes, clear after delay
    setTimeout(() => setSelectedAnomaly(null), 300);
  };

  // Animation hook
  const investigationActive = state?.metadata?.status === 'active' || state?.metadata?.status === 'initializing';
  // Allow manual control via toggle button - respect user's choice
  const shouldScan = uiState.isScanning;

  // Debug logging removed to prevent performance issues
  // Uncomment for debugging if needed:
  // console.log('🎯 [RadarVisualization] Animation config:', { ... });

  const animation = useRadarAnimation({
    isScanning: shouldScan
  });

  // Calculate max radius for scanning ray
  const maxRadius = useMemo(() => {
    if (agents.length === 0) return 300;
    return Math.max(...agents.map((a) => a.radius)) + 50;
  }, [agents]);

  // Determine which anomalies should glow
  const glowingAnomalies = useMemo(() => {
    const glowing = new Set<string>();
    if (animation.isAnimating) {
      anomalies.forEach((anomaly) => {
        const toolAngle = Math.atan2(
          anomaly.position.y - RADAR_CENTER,
          anomaly.position.x - RADAR_CENTER
        );

        if (animation.isAnomalyGlowing(toolAngle)) {
          glowing.add(anomaly.id);
        }
      });
    }
    return glowing;
  }, [anomalies, animation.isAnimating, animation.scanAngle, animation.isAnomalyGlowing]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-gray-950 ${className}`}>
      <svg
        width={RADAR_SIZE}
        height={RADAR_SIZE}
        viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
        className="border border-cyan-900/30 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 70%)'
        }}
      >
        {/* Minimal background grid - single outer circle */}
        <circle
          cx={RADAR_CENTER}
          cy={RADAR_CENTER}
          r={maxRadius}
          fill="none"
          stroke="rgba(6, 182, 212, 0.2)"
          strokeWidth={2}
        />

        {/* Agent rings with labels */}
        <RadarAgentRings
          agents={agents}
          showLabels={uiState.showLabels}
          centerX={RADAR_CENTER}
          centerY={RADAR_CENTER}
        />

        {/* Anomaly blips */}
        <RadarAnomalies
          anomalies={anomalies}
          filterRiskLevel={uiState.filterRiskLevel}
          glowingAnomalies={glowingAnomalies}
          onAnomalyClick={handleAnomalyClick}
          showLabels={uiState.showLabels}
          centerX={RADAR_CENTER}
          centerY={RADAR_CENTER}
        />

        {/* Scanning ray */}
        <ScanningRay
          angle={animation.scanAngle}
          maxRadius={maxRadius}
          isScanning={shouldScan}
          centerX={RADAR_CENTER}
          centerY={RADAR_CENTER}
        />

        {/* Scanning radar needle - rotates continuously while investigating */}
        <RadarNeedle
          riskLevel={stats?.averageRiskLevel || 0}
          scanAngle={animation.scanAngle}
          isScanning={shouldScan}
          centerX={RADAR_CENTER}
          centerY={RADAR_CENTER}
          length={maxRadius * 0.7}
          animate={shouldScan}
        />
      </svg>

      {/* Minimal control overlay */}
      <div className="absolute top-20 right-4 flex gap-2">
        {onToggleScanning && (
          <button
            onClick={onToggleScanning}
            className="px-3 py-1 bg-cyan-900/50 hover:bg-cyan-800/50 text-cyan-300 rounded text-sm transition-colors"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {uiState.isScanning ? '⏸ PAUSE' : '▶ RESUME'}
          </button>
        )}
        {onToggleLabels && (
          <button
            onClick={onToggleLabels}
            className="px-3 py-1 bg-cyan-900/50 hover:bg-cyan-800/50 text-cyan-300 rounded text-sm transition-colors"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {uiState.showLabels ? '🏷️ HIDE LABELS' : '🏷️ SHOW LABELS'}
          </button>
        )}
      </div>

      {/* Anomaly Details Modal */}
      <AnomalyDetailsModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        anomaly={selectedAnomaly}
      />
    </div>
  );
};

export default RadarVisualization;
