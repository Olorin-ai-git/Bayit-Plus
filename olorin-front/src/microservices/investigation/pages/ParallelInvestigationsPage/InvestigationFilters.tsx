import React from 'react';
import { InvestigationStatusType } from '../../types/parallelInvestigations';

interface InvestigationFiltersProps {
  selectedStatus: InvestigationStatusType | 'ALL';
  onStatusChange: (status: InvestigationStatusType | 'ALL') => void;
}

const STATUS_OPTIONS: Array<{ value: InvestigationStatusType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ERROR', label: 'Error' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function InvestigationFilters({
  selectedStatus,
  onStatusChange,
}: InvestigationFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
      <select
        value={selectedStatus}
        onChange={(e) => onStatusChange(e.target.value as InvestigationStatusType | 'ALL')}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
