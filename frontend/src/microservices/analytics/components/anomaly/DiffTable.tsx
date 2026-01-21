/**
 * DiffTable Component - Visual diff table for replay comparison
 * Shows new-only, missing, and overlapping anomalies with score differences
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React from 'react';
import { DataTable } from '../common/DataTable';
import { SeverityBadge } from '../common/SeverityBadge';
import type { AnomalyEvent } from '../../types/anomaly';

export interface DiffTableProps {
  newAnomalies: AnomalyEvent[];
  missingAnomalies: AnomalyEvent[];
  scoreDifferences: Array<{
    anomaly_id: string;
    replay_score: number;
    production_score: number;
    diff: number;
  }>;
  className?: string;
}

export const DiffTable: React.FC<DiffTableProps> = ({
  newAnomalies,
  missingAnomalies,
  scoreDifferences,
  className = '',
}) => {
  const newColumns = [
    {
      key: 'window_start',
      label: 'Time',
      sortable: true,
      render: (value: string) => {
        if (!value) return <span className="text-corporate-textTertiary">-</span>;
        try {
          return (
            <span className="text-corporate-textPrimary">
              {new Date(value).toLocaleString()}
            </span>
          );
        } catch {
          return <span className="text-corporate-textTertiary">{String(value)}</span>;
        }
      },
    },
    {
      key: 'metric',
      label: 'Metric',
      sortable: true,
      render: (value: string) => {
        if (!value) return <span className="text-corporate-textTertiary">-</span>;
        return <span className="text-corporate-textPrimary font-medium">{value}</span>;
      },
    },
    {
      key: 'score',
      label: 'Score',
      sortable: true,
      render: (value: number) => {
        if (value === undefined || value === null) return <span className="text-corporate-textTertiary">-</span>;
        return <span className="text-green-400 font-semibold">{value.toFixed(2)}</span>;
      },
    },
    {
      key: 'severity',
      label: 'Severity',
      sortable: true,
      render: (value: string) => {
        if (!value) return <span className="text-corporate-textTertiary">-</span>;
        return <SeverityBadge severity={value as 'critical' | 'warn' | 'info'} />;
      },
    },
  ];

  const missingColumns = [
    {
      key: 'window_start',
      label: 'Time',
      sortable: true,
      render: (value: string) => {
        if (!value) return <span className="text-corporate-textTertiary">-</span>;
        try {
          return (
            <span className="text-corporate-textPrimary">
              {new Date(value).toLocaleString()}
            </span>
          );
        } catch {
          return <span className="text-corporate-textTertiary">{String(value)}</span>;
        }
      },
    },
    {
      key: 'metric',
      label: 'Metric',
      sortable: true,
      render: (value: string) => {
        if (!value) return <span className="text-corporate-textTertiary">-</span>;
        return <span className="text-corporate-textPrimary font-medium">{value}</span>;
      },
    },
    {
      key: 'score',
      label: 'Score',
      sortable: true,
      render: (value: number) => {
        if (value === undefined || value === null) return <span className="text-corporate-textTertiary">-</span>;
        return <span className="text-red-400 font-semibold">{value.toFixed(2)}</span>;
      },
    },
    {
      key: 'severity',
      label: 'Severity',
      sortable: true,
      render: (value: string) => {
        if (!value) return <span className="text-corporate-textTertiary">-</span>;
        return <SeverityBadge severity={value as 'critical' | 'warn' | 'info'} />;
      },
    },
  ];

  const scoreDiffColumns = [
    {
      key: 'anomaly_id',
      label: 'Anomaly ID',
      sortable: false,
      render: (value: string) => {
        if (!value || typeof value !== 'string') {
          return <span className="text-corporate-textTertiary">-</span>;
        }
        const strValue = String(value);
        if (strValue.length === 0) {
          return <span className="text-corporate-textTertiary">-</span>;
        }
        return (
          <span className="text-corporate-textSecondary text-xs font-mono">
            {strValue.substring(0, 8)}...
          </span>
        );
      },
    },
    {
      key: 'production_score',
      label: 'Production',
      sortable: true,
      render: (value: number) => {
        if (value === undefined || value === null || (typeof value !== 'number' && isNaN(Number(value)))) {
          return <span className="text-corporate-textTertiary">-</span>;
        }
        const numValue = typeof value === 'number' ? value : Number(value);
        return <span className="text-corporate-textSecondary">{numValue.toFixed(2)}</span>;
      },
    },
    {
      key: 'replay_score',
      label: 'Replay',
      sortable: true,
      render: (value: number) => {
        if (value === undefined || value === null || (typeof value !== 'number' && isNaN(Number(value)))) {
          return <span className="text-corporate-textTertiary">-</span>;
        }
        const numValue = typeof value === 'number' ? value : Number(value);
        return <span className="text-corporate-textPrimary">{numValue.toFixed(2)}</span>;
      },
    },
    {
      key: 'diff',
      label: 'Difference',
      sortable: true,
      render: (value: number) => {
        if (value === undefined || value === null) return <span className="text-corporate-textTertiary">-</span>;
        const isPositive = value > 0;
        return (
          <span
            className={`font-semibold ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {value.toFixed(2)}
          </span>
        );
      },
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* New Anomalies */}
      <div>
        <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3">
          New Anomalies ({newAnomalies.length})
          <span className="ml-2 text-sm text-green-400">Caught by new config</span>
        </h3>
        {newAnomalies.length > 0 ? (
          <DataTable data={newAnomalies} columns={newColumns} />
        ) : (
          <div className="text-sm text-corporate-textTertiary p-4 text-center glass-md rounded-lg border border-corporate-borderPrimary/40">
            No new anomalies detected
          </div>
        )}
      </div>

      {/* Missing Anomalies */}
      <div>
        <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3">
          Missing Anomalies ({missingAnomalies.length})
          <span className="ml-2 text-sm text-red-400">Prod had, new config didn't</span>
        </h3>
        {missingAnomalies.length > 0 ? (
          <DataTable data={missingAnomalies} columns={missingColumns} />
        ) : (
          <div className="text-sm text-corporate-textTertiary p-4 text-center glass-md rounded-lg border border-corporate-borderPrimary/40">
            No missing anomalies
          </div>
        )}
      </div>

      {/* Score Differences */}
      {scoreDifferences.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3">
            Score Differences ({scoreDifferences.length})
            <span className="ml-2 text-sm text-corporate-textSecondary">Overlap with score deltas</span>
          </h3>
          <DataTable data={scoreDifferences} columns={scoreDiffColumns} />
        </div>
      )}
    </div>
  );
};

