/**
 * RadarHUDHeader Component
 * Feature: 004-new-olorin-frontend
 *
 * Minimal HUD-style header displaying investigation status and entity metadata.
 * Uses single font family and displays only essential information.
 */

import React from 'react';
import type { RadarStats, RadarMetadata } from '@shared/types/radar.types';

export interface RadarHUDHeaderProps {
  stats: RadarStats;
  metadata: RadarMetadata;
  isScanning: boolean;
  className?: string;
}

/**
 * Minimal HUD-style header for radar visualization
 */
export const RadarHUDHeader: React.FC<RadarHUDHeaderProps> = ({
  stats,
  metadata,
  isScanning,
  className = ''
}) => {

  return (
    <div
      className={`w-full bg-black/40 backdrop-blur-md border-2 border-corporate-accentPrimary rounded-lg p-4 shadow-2xl shadow-corporate-accentPrimary/20 ${className}`}
    >
      {/* Single Row: All items aligned horizontally */}
      <div className="flex items-center justify-between gap-8">
        {/* Left: Status + Entity */}
        <div className="flex items-center gap-8 flex-1">
          {/* Status */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs text-corporate-textTertiary uppercase font-semibold">
              Status
            </span>
            <div className="flex items-center gap-1">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isScanning
                    ? 'bg-corporate-success animate-pulse shadow-lg shadow-corporate-success'
                    : 'bg-corporate-textDisabled'
                }`}
              />
              <span
                className={`text-sm font-bold ${
                  isScanning
                    ? 'text-corporate-success'
                    : 'text-corporate-textDisabled'
                }`}
              >
                {isScanning ? 'ACTIVE' : 'PAUSED'}
              </span>
            </div>
          </div>

          {/* Entity Information */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs text-corporate-textTertiary uppercase font-semibold">
              Entity
            </span>
            <span className="text-sm font-semibold text-corporate-accentSecondary">
              {metadata.entityId}
            </span>
            <span className="text-xs text-corporate-textTertiary px-1.5 py-0.5 bg-black/30 rounded">
              {metadata.entityType}
            </span>
          </div>
        </div>

        {/* Right: Key Metrics - inline key-value pairs with consistent font */}
        <div className="flex items-center gap-8 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-corporate-textTertiary uppercase font-semibold">
              Anomalies
            </span>
            <span className="text-xs text-corporate-textTertiary uppercase font-semibold text-corporate-accentPrimary">
              {stats.totalAnomalies}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-corporate-textTertiary uppercase font-semibold">
              Critical
            </span>
            <span
              className={`text-xs uppercase font-semibold ${
                stats.criticalAnomalies > 0
                  ? 'text-corporate-error'
                  : 'text-corporate-textDisabled'
              }`}
            >
              {stats.criticalAnomalies}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-corporate-textTertiary uppercase font-semibold">
              Investigation
            </span>
            <span className="text-xs font-semibold text-corporate-accentSecondary uppercase">
              {metadata.investigationId.substring(0, 12)}...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarHUDHeader;
