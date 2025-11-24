/**
 * AnomalyTable Component - Table displaying anomaly events
 * Uses DataTable component with glassmorphic styling
 */

import React from 'react';
import { DataTable } from '../common/DataTable';
import { SeverityBadge } from '../common/SeverityBadge';
import { Sparkline } from '../common/Sparkline';
import type { AnomalyEvent } from '../../types/anomaly';

export interface AnomalyTableProps {
  anomalies: AnomalyEvent[];
  onRowClick?: (anomaly: AnomalyEvent) => void;
  onAnomalyClick?: (anomaly: AnomalyEvent) => void;
  onInvestigate?: (anomaly: AnomalyEvent) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  className?: string;
}

export const AnomalyTable: React.FC<AnomalyTableProps> = ({
  anomalies,
  onRowClick,
  onAnomalyClick,
  onInvestigate,
  sortKey,
  sortDirection,
  onSort,
  className = '',
}) => {
  const columns = [
    {
      key: 'windowStart', // Use camelCase since BaseApiService converts snake_case to camelCase
      label: 'Time',
      sortable: true,
      render: (value: any, row: AnomalyEvent) => {
        // Try multiple field name formats (camelCase and snake_case for compatibility)
        const timeValue = value || 
          (row as any).windowStart || 
          (row as any).window_start ||
          (row as any).createdAt || 
          (row as any).created_at;
        
        if (!timeValue) {
          return <span className="text-corporate-textTertiary">-</span>;
        }
        
        // Convert to string if it's not already
        const timeStr = String(timeValue).trim();
        if (!timeStr || timeStr === 'null' || timeStr === 'undefined') {
          return <span className="text-corporate-textTertiary">-</span>;
        }
        
        try {
          const date = new Date(timeStr);
          // Check if date is valid
          if (isNaN(date.getTime())) {
            return <span className="text-corporate-textTertiary">-</span>;
          }
          
          return (
            <span className="text-corporate-textPrimary">
              {date.toLocaleString()}
            </span>
          );
        } catch (error) {
          // If date parsing fails, show fallback
          return <span className="text-corporate-textTertiary">-</span>;
        }
      },
    },
    {
      key: 'severity',
      label: 'Severity',
      sortable: true,
      render: (value: string, row: AnomalyEvent) => {
        if (!value) return <span className="text-corporate-textTertiary">-</span>;
        return <SeverityBadge severity={value as 'critical' | 'warn' | 'info'} />;
      },
    },
    {
      key: 'metric',
      label: 'Metric',
      sortable: true,
      render: (value: string) => (
        <span className="text-corporate-textPrimary font-medium">{value}</span>
      ),
    },
    {
      key: 'cohort',
      label: 'Cohort',
      sortable: false,
      render: (value: Record<string, string>) => {
        const cohortStr = Object.entries(value)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        return (
          <span className="text-corporate-textSecondary text-xs">
            {cohortStr}
          </span>
        );
      },
    },
    {
      key: 'score',
      label: 'Score',
      sortable: true,
      render: (value: number) => (
        <span className="text-corporate-textPrimary font-semibold">
          {value.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'observed',
      label: 'Observed',
      sortable: true,
      render: (value: number) => (
        <span className="text-corporate-textSecondary">
          {typeof value === 'number' ? value.toFixed(2) : String(value)}
        </span>
      ),
    },
    {
      key: 'expected',
      label: 'Expected',
      sortable: true,
      render: (value: number) => (
        <span className="text-corporate-textSecondary">
          {typeof value === 'number' ? value.toFixed(2) : String(value)}
        </span>
      ),
    },
    {
      key: 'trend',
      label: 'Trend',
      sortable: false,
      render: (_value: any, row: AnomalyEvent) => {
        const trendData = row.evidence?.trend_data || [];
        if (trendData.length === 0) {
          return <span className="text-corporate-textTertiary text-xs">-</span>;
        }
        return (
          <Sparkline
            data={trendData}
            width={60}
            height={20}
            color="#A855F7"
            strokeWidth={1.5}
          />
        );
      },
    },
    {
      key: 'investigation',
      label: 'Investigation',
      sortable: false,
      render: (_value: any, row: AnomalyEvent) => {
        if (row.investigation_id && typeof row.investigation_id === 'string') {
          const invId = row.investigation_id.substring(0, 8);
          const investigationsUrl = `/investigations/${row.investigation_id}`;
          return (
            <a
              href={investigationsUrl}
              onClick={(e) => {
                e.stopPropagation();
                // Navigate to investigations microservice
                window.location.href = investigationsUrl;
              }}
              className="text-corporate-accentPrimary hover:text-corporate-accentPrimaryHover text-xs font-medium underline"
              aria-label={`View investigation ${invId}`}
            >
              {invId}...
            </a>
          );
        }
        if (onInvestigate) {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInvestigate(row);
              }}
              className="px-2 py-1 text-xs font-medium text-corporate-accentPrimary hover:text-corporate-accentPrimaryHover border border-corporate-accentPrimary/50 rounded hover:bg-corporate-accentPrimary/10 transition-colors"
              aria-label={`Create investigation for anomaly ${row.id}`}
            >
              Investigate
            </button>
          );
        }
        return <span className="text-corporate-textTertiary text-xs">-</span>;
      },
    },
  ];

  return (
    <DataTable
      data={anomalies}
      columns={columns}
      onRowClick={onRowClick}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSort={onSort}
      className={className}
    />
  );
};

