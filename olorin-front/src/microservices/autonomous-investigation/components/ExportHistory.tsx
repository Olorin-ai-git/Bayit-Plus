import React, { useState, useMemo } from 'react';
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarIcon,
  DocumentTextIcon,
  TableCellsIcon,
  CodeBracketIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { ExportHistoryItem } from '../hooks/useExportReporting';

interface ExportHistoryProps {
  exportHistory: ExportHistoryItem[];
  onRedownload: (item: ExportHistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

type FilterStatus = 'all' | 'completed' | 'failed' | 'scheduled';
type SortBy = 'timestamp' | 'status' | 'format' | 'investigation';

export const ExportHistory: React.FC<ExportHistoryProps> = ({
  exportHistory,
  onRedownload,
  onDelete,
  onClearAll
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'scheduled':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'pdf':
        return <DocumentTextIcon className="h-4 w-4 text-red-500" />;
      case 'csv':
        return <TableCellsIcon className="h-4 w-4 text-green-500" />;
      case 'json':
        return <CodeBracketIcon className="h-4 w-4 text-blue-500" />;
      case 'excel':
        return <TableCellsIcon className="h-4 w-4 text-green-600" />;
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date)
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAndSortedHistory = useMemo(() => {
    let filtered = exportHistory;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.investigationTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.format.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.template.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.investigationId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'format':
          comparison = a.format.localeCompare(b.format);
          break;
        case 'investigation':
          comparison = a.investigationTitle.localeCompare(b.investigationTitle);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [exportHistory, searchTerm, filterStatus, sortBy, sortOrder]);

  const statusCounts = useMemo(() => {
    return exportHistory.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [exportHistory]);

  const handleSort = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Export History</h3>
            <p className="text-sm text-gray-600">
              {exportHistory.length} total exports
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClearAll}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Clear All
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="text-center">
              <div className="text-2xl font-semibold text-gray-900">{count}</div>
              <div className={`text-sm capitalize ${
                status === 'completed' ? 'text-green-600' :
                status === 'failed' ? 'text-red-600' :
                status === 'scheduled' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search exports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          {/* Sort By */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-');
              setSortBy(newSortBy as SortBy);
              setSortOrder(newSortOrder as 'asc' | 'desc');
            }}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="timestamp-desc">Newest First</option>
            <option value="timestamp-asc">Oldest First</option>
            <option value="status-asc">Status A-Z</option>
            <option value="status-desc">Status Z-A</option>
            <option value="format-asc">Format A-Z</option>
            <option value="investigation-asc">Investigation A-Z</option>
          </select>
        </div>
      </div>

      {/* Export List */}
      <div className="divide-y divide-gray-200">
        {filteredAndSortedHistory.length > 0 ? (
          filteredAndSortedHistory.map((item) => {
            const timestamp = formatTimestamp(item.timestamp);
            return (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(item.status)}
                    <div className="flex items-center space-x-2">
                      {getFormatIcon(item.format)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {item.investigationTitle}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span>ID: {item.investigationId}</span>
                          <span>{item.format} • {item.template}</span>
                          <span>{timestamp.relative}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {item.status === 'completed' && item.downloadUrl && (
                      <button
                        onClick={() => onRedownload(item)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Download
                      </button>
                    )}
                    {item.status === 'scheduled' && (
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {timestamp.date} {timestamp.time}
                      </div>
                    )}
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {item.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                    <strong>Error:</strong> {item.error}
                  </div>
                )}

                {item.filename && (
                  <div className="mt-2 text-xs text-gray-500">
                    File: {item.filename}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="px-6 py-8 text-center">
            <ArrowDownTrayIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Exports Found</h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all'
                ? 'No exports match your current filters.'
                : 'Export history will appear here when you generate reports.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};