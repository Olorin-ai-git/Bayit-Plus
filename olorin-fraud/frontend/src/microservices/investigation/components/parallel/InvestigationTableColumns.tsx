/**
 * Investigation Table Columns
 * Feature: 001-startup-analysis-flow
 *
 * Column definitions for the parallel investigations table.
 */

import React from 'react';
import type { Column } from '@shared/components/Table';
import { DurationDisplay } from './DurationDisplay';
import type { RevenueMetrics, ConfusionMetrics } from '../../types/financialMetrics';

export interface ParallelInvestigationRow {
  id: string;
  entityValue: string;
  merchantName: string;
  status: 'CREATED' | 'SETTINGS' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'CANCELLED';
  riskScore: number;
  progressPercent: number;
  fraudTxCount: number;
  fraudPercent: number | null;
  startTime: string;
  endTime?: string;
  updatedAt?: string;
  restartedToId?: string;
  financialMetrics?: RevenueMetrics | null;
  confusionMetrics?: ConfusionMetrics | null;
}

interface ColumnHandlers {
  onNavigate: (id: string) => void;
  onCancel: (id: string) => void;
  onRestart: (id: string) => void;
  onTogglePause: (id: string, status: string) => void;
}

export function createBaseColumns(handlers: ColumnHandlers): Column<ParallelInvestigationRow>[] {
  return [
    createIdColumn(handlers.onNavigate),
    createEntityColumn(),
    createMerchantColumn(),
    createStatusColumn(),
    createProgressColumn(),
    createRiskScoreColumn(),
    createFraudTxColumn(),
    createDurationColumn(),
    createActionsColumn(handlers),
  ];
}

function createIdColumn(onNavigate: (id: string) => void): Column<ParallelInvestigationRow> {
  return {
    header: 'Investigation ID',
    accessor: (row) => row.id,
    id: 'id',
    sortable: true,
    className: 'font-mono text-xs text-corporate-accentPrimary cursor-pointer hover:underline',
    cell: (value) => (
      <span onClick={(e) => { e.stopPropagation(); onNavigate(value); }}>
        {value}
      </span>
    ),
  };
}

function createEntityColumn(): Column<ParallelInvestigationRow> {
  return {
    header: 'Entity',
    accessor: (row) => row.entityValue,
    id: 'entityValue',
    sortable: true,
    className: 'font-medium text-white',
  };
}

function createMerchantColumn(): Column<ParallelInvestigationRow> {
  return {
    header: 'Merchant',
    accessor: (row) => row.merchantName,
    id: 'merchantName',
    sortable: true,
    className: 'text-corporate-textSecondary',
  };
}

function createStatusColumn(): Column<ParallelInvestigationRow> {
  return {
    header: 'Status',
    accessor: (row) => row.status,
    id: 'status',
    sortable: true,
    cell: (value, row) => {
      if (row.restartedToId) {
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-corporate-accentPrimary animate-pulse">RESTARTED</span>
            <span className="text-[10px] text-corporate-textTertiary font-mono">
              → {row.restartedToId.substring(0, 8)}
            </span>
          </div>
        );
      }
      const colorMap: Record<string, string> = {
        COMPLETED: 'text-corporate-success',
        IN_PROGRESS: 'text-corporate-info',
        ERROR: 'text-corporate-error',
        FAILED: 'text-corporate-error',
        CANCELLED: 'text-corporate-warning',
      };
      const colorClass = colorMap[value] || 'text-corporate-textSecondary';
      const animate = value === 'IN_PROGRESS';
      return <span className={`font-semibold ${colorClass} ${animate ? 'animate-pulse' : ''}`}>{value}</span>;
    },
  };
}

function createProgressColumn(): Column<ParallelInvestigationRow> {
  return {
    header: 'Progress',
    accessor: (row) => row.progressPercent,
    id: 'progress',
    sortable: true,
    width: '180px',
    cell: (value) => (
      <div className="w-full max-w-[180px]">
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-white/70 font-mono">{value}%</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden backdrop-blur-md border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-corporate-accentPrimary/80 to-blue-400/80 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </div>
      </div>
    ),
  };
}

function createRiskScoreColumn(): Column<ParallelInvestigationRow> {
  return {
    header: 'Risk Score',
    accessor: (row) => row.riskScore,
    id: 'riskScore',
    sortable: true,
    cell: (value) => {
      if (value === 0) return <span className="font-bold text-corporate-textSecondary">{value.toFixed(2)}</span>;
      const lightness = 85 - Math.min(1, Math.max(0, value)) * 35;
      return <span className="font-bold" style={{ color: `hsl(0, 100%, ${lightness}%)` }}>{value.toFixed(2)}</span>;
    },
  };
}

function createFraudTxColumn(): Column<ParallelInvestigationRow> {
  return {
    header: 'Fraud Tx',
    accessor: (row) => row.fraudTxCount,
    id: 'fraudTxCount',
    sortable: true,
    className: 'text-right',
    cell: (value, row) => (
      <div className="flex flex-col items-end">
        <span className="font-medium">{value}</span>
        <span className="text-[10px] text-corporate-textTertiary">
          {row.fraudPercent !== null ? `${row.fraudPercent.toFixed(1)}%` : 'N/A'}
        </span>
      </div>
    ),
  };
}

function createDurationColumn(): Column<ParallelInvestigationRow> {
  return {
    header: 'Duration',
    accessor: (row) => row.startTime,
    id: 'duration',
    sortable: true,
    cell: (_, row) => <DurationDisplay startTime={row.startTime} endTime={row.endTime} status={row.status} />,
  };
}

function createActionsColumn(handlers: ColumnHandlers): Column<ParallelInvestigationRow> {
  return {
    header: '',
    id: 'actions',
    width: '160px',
    accessor: () => '',
    cell: (_, row) => <ActionButtons row={row} handlers={handlers} />,
  };
}

const ActionButtons: React.FC<{ row: ParallelInvestigationRow; handlers: ColumnHandlers }> = ({ row, handlers }) => {
  const canCancel = ['CREATED', 'SETTINGS', 'IN_PROGRESS'].includes(row.status);
  const canPause = row.status === 'IN_PROGRESS';
  const canResume = row.status === 'SETTINGS';
  let canRestart = ['COMPLETED', 'ERROR', 'FAILED', 'CANCELLED'].includes(row.status);
  let isStale = false;

  if (row.status === 'IN_PROGRESS' && row.updatedAt) {
    const diffMinutes = (Date.now() - new Date(row.updatedAt).getTime()) / (1000 * 60);
    if (diffMinutes > 15) {
      isStale = true;
      canRestart = true;
    }
  }

  return (
    <div className="flex justify-end gap-1 items-center invisible group-hover:visible" onClick={(e) => e.stopPropagation()}>
      {canRestart && <RestartButton onClick={() => handlers.onRestart(row.id)} isStale={isStale} />}
      {(canPause || canResume) && <PauseResumeButton onClick={() => handlers.onTogglePause(row.id, row.status)} canPause={canPause} />}
      {canCancel && <CancelButton onClick={() => handlers.onCancel(row.id)} />}
    </div>
  );
};

const RestartButton: React.FC<{ onClick: () => void; isStale: boolean }> = ({ onClick, isStale }) => (
  <div className="relative group/btn">
    <button onClick={onClick} className={`p-1 rounded-full text-corporate-textTertiary hover:text-corporate-accentPrimary hover:bg-corporate-accentPrimary/10 ${isStale ? 'text-corporate-warning' : ''}`}>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    </button>
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-corporate-bgSecondary border border-corporate-borderPrimary text-white text-[10px] rounded opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none z-10">
      {isStale ? 'Restart Stale Investigation' : 'Restart Investigation'}
    </div>
  </div>
);

const PauseResumeButton: React.FC<{ onClick: () => void; canPause: boolean }> = ({ onClick, canPause }) => (
  <div className="relative group/btn">
    <button onClick={onClick} className="p-1 rounded-full text-corporate-textTertiary hover:text-corporate-info hover:bg-corporate-info/10">
      {canPause ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
      )}
    </button>
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-corporate-bgSecondary border border-corporate-borderPrimary text-white text-[10px] rounded opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none z-10">
      {canPause ? 'Pause Investigation' : 'Resume Investigation'}
    </div>
  </div>
);

const CancelButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <div className="relative group/btn">
    <button onClick={onClick} className="p-1 rounded-full text-corporate-textTertiary hover:text-corporate-error hover:bg-corporate-error/10">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-corporate-bgSecondary border border-corporate-borderPrimary text-white text-[10px] rounded opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none z-10">
      Cancel Investigation
    </div>
  </div>
);
