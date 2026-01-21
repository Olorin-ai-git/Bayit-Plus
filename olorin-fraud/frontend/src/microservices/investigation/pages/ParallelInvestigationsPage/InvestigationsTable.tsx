import React from 'react';
import { Table } from '../../../../shared/components/Table/Table';
import { ParallelInvestigation } from '../../types/parallelInvestigations';

interface InvestigationsTableProps {
  investigations: ParallelInvestigation[];
  loading: boolean;
  error: Error | null;
  onRowClick: (investigation: ParallelInvestigation) => void;
}

export function InvestigationsTable({
  investigations,
  loading,
  error,
  onRowClick,
}: InvestigationsTableProps) {
  const tableConfig = {
    columns: [
      {
        id: 'investigationId',
        header: 'Investigation ID',
        accessor: (row: ParallelInvestigation) => row.investigationId || row.id,
        sortable: true,
      },
      {
        id: 'entityValue',
        header: 'Entity Value',
        accessor: (row: ParallelInvestigation) => row.entityValue || '-',
      },
      {
        id: 'status',
        header: 'Status',
        accessor: (row: ParallelInvestigation) => row.status,
        sortable: true,
        cell: (value: string) => (
          <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusClass(value)}`}>
            {value}
          </span>
        ),
      },
      {
        id: 'riskScore',
        header: 'Risk Score',
        accessor: (row: ParallelInvestigation) => row.riskScore,
        sortable: true,
        cell: (value: number) => (
          <span className={`font-semibold ${getRiskScoreColor(value)}`}>
            {(value * 100).toFixed(1)}%
          </span>
        ),
      },
      {
        id: 'startTime',
        header: 'Start Time',
        accessor: (row: ParallelInvestigation) => row.startTime,
        sortable: true,
        cell: (value: string) => formatDateTime(value),
      },
    ],
    getRowKey: (row: ParallelInvestigation) => row.id,
    onRowClick,
    paginated: true,
    pageSize: 20,
    emptyMessage: 'No investigations found',
  };

  return (
    <Table<ParallelInvestigation>
      data={investigations}
      config={tableConfig}
      loading={loading}
      error={error}
    />
  );
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'ERROR':
      return 'bg-red-100 text-red-800';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getRiskScoreColor(score: number): string {
  if (score >= 0.75) return 'text-red-600';
  if (score >= 0.5) return 'text-orange-600';
  if (score >= 0.25) return 'text-yellow-600';
  return 'text-green-600';
}

function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '-';
  }
}
