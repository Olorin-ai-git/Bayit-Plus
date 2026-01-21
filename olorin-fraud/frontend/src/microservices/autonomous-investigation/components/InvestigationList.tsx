import React, { useState, useMemo } from 'react';
import {
  PlusIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { Investigation, InvestigationStatus, InvestigationPriority } from '../types/investigation';
import { LoadingSpinner } from '../../core-ui/components/LoadingSpinner';

interface InvestigationListProps {
  investigations: Investigation[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreateInvestigation: () => void;
  onViewInvestigation: (id: string) => void;
  onDeleteInvestigation: (id: string) => Promise<void>;
}

interface FilterState {
  search: string;
  status: InvestigationStatus[];
  priority: InvestigationPriority[];
  dateRange: 'all' | '7d' | '30d' | '90d';
}

export const InvestigationList: React.FC<InvestigationListProps> = ({
  investigations,
  isLoading,
  onRefresh,
  onCreateInvestigation,
  onViewInvestigation,
  onDeleteInvestigation
}) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: [],
    priority: [],
    dateRange: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'priority' | 'status'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedInvestigations = useMemo(() => {
    let filtered = investigations.filter(investigation => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        if (
          !investigation.title.toLowerCase().includes(searchTerm) &&
          !investigation.description.toLowerCase().includes(searchTerm) &&
          !investigation.id.toLowerCase().includes(searchTerm)
        ) {
          return false;
        }
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(investigation.status)) {
        return false;
      }

      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(investigation.priority)) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const createdAt = new Date(investigation.createdAt);
        const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        switch (filters.dateRange) {
          case '7d':
            if (daysDiff > 7) return false;
            break;
          case '30d':
            if (daysDiff > 30) return false;
            break;
          case '90d':
            if (daysDiff > 90) return false;
            break;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [investigations, filters, sortBy, sortOrder]);

  const getStatusIcon = (status: InvestigationStatus) => {
    switch (status) {
      case 'running':
        return <PlayIcon className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <PauseIcon className="h-4 w-4 text-yellow-500" />;
      case 'stopped':
        return <StopIcon className="h-4 w-4 text-gray-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: InvestigationStatus) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'stopped': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: InvestigationPriority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const statusOptions: InvestigationStatus[] = ['pending', 'running', 'paused', 'completed', 'failed', 'stopped', 'cancelled'];
  const priorityOptions: InvestigationPriority[] = ['low', 'medium', 'high', 'critical'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Investigations</h1>
          <p className="text-gray-600">Manage and monitor your autonomous investigations</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={onCreateInvestigation}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Investigation
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search investigations..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="updatedAt-desc">Last Updated</option>
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="priority-desc">High Priority</option>
              <option value="status-asc">Status</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="space-y-2">
                  {statusOptions.map(status => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({ ...prev, status: [...prev.status, status] }));
                          } else {
                            setFilters(prev => ({ ...prev, status: prev.status.filter(s => s !== status) }));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <div className="space-y-2">
                  {priorityOptions.map(priority => (
                    <label key={priority} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.priority.includes(priority)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({ ...prev, priority: [...prev.priority, priority] }));
                          } else {
                            setFilters(prev => ({ ...prev, priority: prev.priority.filter(p => p !== priority) }));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{priority}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {filteredAndSortedInvestigations.length} Investigation{filteredAndSortedInvestigations.length !== 1 ? 's' : ''}
            </h3>
            {(filters.search || filters.status.length > 0 || filters.priority.length > 0 || filters.dateRange !== 'all') && (
              <button
                onClick={() => setFilters({ search: '', status: [], priority: [], dateRange: 'all' })}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" message="Loading investigations..." />
          </div>
        ) : filteredAndSortedInvestigations.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredAndSortedInvestigations.map(investigation => (
              <div key={investigation.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900 truncate">{investigation.title}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(investigation.status)}`}>
                        {getStatusIcon(investigation.status)}
                        <span className="ml-1">{investigation.status.toUpperCase()}</span>
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(investigation.priority)}`}>
                        {investigation.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{investigation.description}</p>
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span>ID: {investigation.id}</span>
                      <span>{investigation.assignedAgents.length} agents</span>
                      {investigation.progress && (
                        <span>{investigation.progress.overall}% complete</span>
                      )}
                      <span>Updated {formatDate(investigation.updatedAt)}</span>
                    </div>

                    {investigation.status === 'running' && investigation.progress && (
                      <div className="mt-3 max-w-md">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{investigation.progress.overall}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${investigation.progress.overall}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onViewInvestigation(investigation.id)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      View
                    </button>

                    {investigation.status !== 'running' && (
                      <button
                        onClick={() => onDeleteInvestigation(investigation.id)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No investigations found</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.status.length > 0 || filters.priority.length > 0 || filters.dateRange !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'Create your first autonomous investigation to get started.'
              }
            </p>
            {!(filters.search || filters.status.length > 0 || filters.priority.length > 0 || filters.dateRange !== 'all') && (
              <button
                onClick={onCreateInvestigation}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Investigation
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};