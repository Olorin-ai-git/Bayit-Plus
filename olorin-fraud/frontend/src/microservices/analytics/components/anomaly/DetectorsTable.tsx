/**
 * DetectorsTable Component - Table displaying detectors with selection and CRUD operations
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../common/DataTable';
import { Panel } from '../common/Panel';
import { useDetectors } from '../../hooks/useDetectors';
import { useToast } from '../../hooks/useToast';
import type { Detector } from '../../types/anomaly';

export interface DetectorsTableProps {
  className?: string;
}

export const DetectorsTable: React.FC<DetectorsTableProps> = ({
  className = '',
}) => {
  const { detectors, loading, deleteDetector, bulkDeleteDetectors } = useDetectors();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(detectors.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleCreate = () => {
    navigate('/analytics/detectors');
  };

  const handleEdit = (detector: Detector) => {
    navigate(`/analytics/detectors/${detector.id}`);
  };

  const handleDelete = async (detector: Detector, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!confirm(`Are you sure you want to delete detector "${detector.name}"?`)) {
      return;
    }

    setIsDeleting(detector.id);
    try {
      await deleteDetector(detector.id);
      showToast('success', 'Detector Deleted', `Detector "${detector.name}" has been deleted`);
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(detector.id);
        return newSet;
      });
    } catch (err) {
      showToast('error', 'Delete Failed', err instanceof Error ? err.message : 'Failed to delete detector');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      showToast('warning', 'No Selection', 'Please select at least one detector to delete');
      return;
    }

    const selectedDetectors = detectors.filter((d) => selectedIds.has(d.id));
    const names = selectedDetectors.map((d) => d.name).join(', ');
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} detector(s)?\n\n${names}`)) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const result = await bulkDeleteDetectors(Array.from(selectedIds));
      showToast('success', 'Bulk Delete Complete', result.message);
      setSelectedIds(new Set());
    } catch (err) {
      showToast('error', 'Bulk Delete Failed', err instanceof Error ? err.message : 'Failed to delete detectors');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const allSelected = detectors.length > 0 && selectedIds.size === detectors.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < detectors.length;

  const columns = [
    {
      key: 'checkbox',
      label: '',
      sortable: false,
      render: (_: any, row: Detector) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            handleSelectRow(row.id, e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-corporate-borderPrimary bg-corporate-bgSecondary text-corporate-accentPrimary focus:ring-corporate-accentPrimary"
        />
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value: string) => (
        <span className="text-corporate-textPrimary font-medium">{value}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value: string) => (
        <span className="text-corporate-textSecondary text-xs px-2 py-1 rounded bg-corporate-bgSecondary border border-corporate-borderPrimary/40">
          {value}
        </span>
      ),
    },
    {
      key: 'cohort_by',
      label: 'Cohorts',
      sortable: false,
      render: (value: string[]) => (
        <span className="text-corporate-textSecondary text-xs">
          {value?.join(', ') || '-'}
        </span>
      ),
    },
    {
      key: 'metrics',
      label: 'Metrics',
      sortable: false,
      render: (value: string[]) => (
        <span className="text-corporate-textSecondary text-xs">
          {value?.join(', ') || '-'}
        </span>
      ),
    },
    {
      key: 'enabled',
      label: 'Status',
      sortable: true,
      render: (value: boolean) => (
        <span
          className={`text-xs px-2 py-1 rounded ${
            value
              ? 'bg-green-900/30 border border-green-500 text-green-300'
              : 'bg-gray-900/30 border border-gray-500 text-gray-300'
          }`}
        >
          {value ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_: any, row: Detector) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            className="px-2 py-1 text-xs rounded bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white transition-colors"
            title="Edit detector"
          >
            Edit
          </button>
          <button
            onClick={(e) => handleDelete(row, e)}
            disabled={isDeleting === row.id}
            className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete detector"
          >
            {isDeleting === row.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <Panel
      title="Detectors"
      subtitle={`${detectors.length} detector(s) configured`}
      variant="outlined"
      padding="md"
      className={className}
      collapsible={true}
      defaultCollapsed={false}
    >
      <div className="space-y-4">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = someSelected;
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-corporate-borderPrimary bg-corporate-bgSecondary text-corporate-accentPrimary focus:ring-corporate-accentPrimary"
            />
            <span className="text-sm text-corporate-textSecondary">
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : 'Select all'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-lg bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white font-medium transition-colors text-sm"
            >
              Create Detector
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isBulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size}`}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div>
          {loading ? (
            <div className="p-8 text-center text-corporate-textTertiary">
              Loading detectors...
            </div>
          ) : detectors.length === 0 ? (
            <div className="p-8 text-center text-corporate-textTertiary">
              No detectors configured. Click "Create Detector" to get started.
            </div>
          ) : (
            <DataTable
              data={detectors}
              columns={columns}
              onRowClick={(row) => handleEdit(row)}
            />
          )}
        </div>
      </div>
    </Panel>
  );
};

