import React, { useState, useMemo } from 'react';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserGroupIcon,
  DocumentTextIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import {
  ManualInvestigation,
  ManualInvestigationStatus,
  Priority,
  InvestigationType,
  InvestigationFilter,
  InvestigationStats
} from '../types/manualInvestigation';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';

interface ManualInvestigationDashboardProps {
  investigations: ManualInvestigation[];
  isLoading: boolean;
  onCreateInvestigation: () => void;
  onViewInvestigation: (id: string) => void;
  onRefresh: () => void;
}

interface StatusCardProps {
  status: ManualInvestigationStatus;
  count: number;
  total: number;
  color: string;
}

const StatusCard: React.FC<StatusCardProps> = ({ status, count, total, color }) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  const getStatusIcon = () => {
    switch (status) {
      case 'in_progress':
        return <ClockIcon className={`h-6 w-6 ${color}`} />;
      case 'completed':
        return <CheckCircleIcon className={`h-6 w-6 ${color}`} />;
      case 'under_review':
        return <EyeIcon className={`h-6 w-6 ${color}`} />;
      case 'on_hold':
        return <ExclamationTriangleIcon className={`h-6 w-6 ${color}`} />;
      default:
        return <DocumentTextIcon className={`h-6 w-6 ${color}`} />;
    }
  };

  const formatStatusLabel = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{formatStatusLabel(status)}</p>
          <p className="text-3xl font-bold text-gray-900">{count}</p>
          <p className="text-sm text-gray-500">{percentage}% of total</p>
        </div>
        {getStatusIcon()}
      </div>
    </div>
  );
};

interface InvestigationCardProps {
  investigation: ManualInvestigation;
  onView: (id: string) => void;
}

const InvestigationCard: React.FC<InvestigationCardProps> = ({ investigation, onView }) => {
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusColor = (status: ManualInvestigationStatus) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'under_review': return 'bg-purple-100 text-purple-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const isOverdue = investigation.dueDate &&
    new Date(investigation.dueDate) < new Date() &&
    investigation.status !== 'completed';

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-sm transition-all duration-150 cursor-pointer"
      onClick={() => onView(investigation.id)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-gray-900 truncate">{investigation.title}</h3>
            {isOverdue && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Overdue
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{investigation.description}</p>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>ID: {investigation.id}</span>
            <span className="flex items-center">
              <UserGroupIcon className="h-4 w-4 mr-1" />
              {investigation.collaborators.length + 1} team members
            </span>
            <span>{investigation.progress.stepsCompleted}/{investigation.progress.stepsTotal} steps</span>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-2 ml-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(investigation.status)}`}>
            {investigation.status.replace('_', ' ')}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(investigation.priority)}`}>
            {investigation.priority.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Created {formatDate(investigation.createdAt)}</span>
          {investigation.dueDate && (
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              Due {formatDate(investigation.dueDate)}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-600">
            {investigation.progress.overall}% complete
          </div>
          <div className="w-20 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${investigation.progress.overall}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ManualInvestigationDashboard: React.FC<ManualInvestigationDashboardProps> = ({
  investigations,
  isLoading,
  onCreateInvestigation,
  onViewInvestigation,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<InvestigationFilter>({});
  const [showFilters, setShowFilters] = useState(false);

  const stats: InvestigationStats = useMemo(() => {
    const total = investigations.length;
    const byStatus = investigations.reduce((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {} as Record<ManualInvestigationStatus, number>);

    const byPriority = investigations.reduce((acc, inv) => {
      acc[inv.priority] = (acc[inv.priority] || 0) + 1;
      return acc;
    }, {} as Record<Priority, number>);

    const byType = investigations.reduce((acc, inv) => {
      acc[inv.type] = (acc[inv.type] || 0) + 1;
      return acc;
    }, {} as Record<InvestigationType, number>);

    const completedInvestigations = investigations.filter(inv => inv.status === 'completed');
    const averageCompletionTime = completedInvestigations.length > 0
      ? completedInvestigations.reduce((acc, inv) => {
          if (inv.startedAt && inv.completedAt) {
            const duration = new Date(inv.completedAt).getTime() - new Date(inv.startedAt).getTime();
            return acc + (duration / (1000 * 60 * 60 * 24)); // days
          }
          return acc;
        }, 0) / completedInvestigations.length
      : 0;

    const overdueCount = investigations.filter(inv =>
      inv.dueDate &&
      new Date(inv.dueDate) < new Date() &&
      inv.status !== 'completed'
    ).length;

    const pendingReviewCount = investigations.filter(inv => inv.status === 'under_review').length;

    return {
      total,
      byStatus,
      byPriority,
      byType,
      averageCompletionTime,
      overdueCount,
      pendingReviewCount
    };
  }, [investigations]);

  const filteredInvestigations = useMemo(() => {
    return investigations.filter(investigation => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          investigation.title.toLowerCase().includes(searchLower) ||
          investigation.description.toLowerCase().includes(searchLower) ||
          investigation.id.toLowerCase().includes(searchLower) ||
          investigation.leadInvestigator.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      // Status filter
      if (selectedFilters.status?.length && !selectedFilters.status.includes(investigation.status)) {
        return false;
      }

      // Priority filter
      if (selectedFilters.priority?.length && !selectedFilters.priority.includes(investigation.priority)) {
        return false;
      }

      // Type filter
      if (selectedFilters.type?.length && !selectedFilters.type.includes(investigation.type)) {
        return false;
      }

      return true;
    });
  }, [investigations, searchTerm, selectedFilters]);

  const recentInvestigations = useMemo(() => {
    return [...filteredInvestigations]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);
  }, [filteredInvestigations]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manual Investigations</h1>
          <p className="text-gray-600">Human-led fraud investigation workflows</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <ChartBarIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" message="Loading investigations..." />
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatusCard
              status="in_progress"
              count={stats.byStatus.in_progress || 0}
              total={stats.total}
              color="text-blue-500"
            />
            <StatusCard
              status="under_review"
              count={stats.byStatus.under_review || 0}
              total={stats.total}
              color="text-purple-500"
            />
            <StatusCard
              status="completed"
              count={stats.byStatus.completed || 0}
              total={stats.total}
              color="text-green-500"
            />
            <StatusCard
              status="on_hold"
              count={stats.byStatus.on_hold || 0}
              total={stats.total}
              color="text-yellow-500"
            />
          </div>

          {/* Summary Metrics */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Investigation Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Active</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-semibold text-red-600">{stats.overdueCount}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-semibold text-purple-600">{stats.pendingReviewCount}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Completion</p>
                <p className="text-2xl font-semibold text-green-600">
                  {stats.averageCompletionTime > 0 ? `${Math.round(stats.averageCompletionTime)}d` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search investigations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      multiple
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value) as ManualInvestigationStatus[];
                        setSelectedFilters(prev => ({ ...prev, status: values }));
                      }}
                    >
                      <option value="draft">Draft</option>
                      <option value="in_progress">In Progress</option>
                      <option value="under_review">Under Review</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      multiple
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value) as Priority[];
                        setSelectedFilters(prev => ({ ...prev, priority: values }));
                      }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      multiple
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value) as InvestigationType[];
                        setSelectedFilters(prev => ({ ...prev, type: values }));
                      }}
                    >
                      <option value="fraud_detection">Fraud Detection</option>
                      <option value="account_takeover">Account Takeover</option>
                      <option value="identity_theft">Identity Theft</option>
                      <option value="payment_fraud">Payment Fraud</option>
                      <option value="data_breach">Data Breach</option>
                      <option value="compliance_violation">Compliance Violation</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Investigations List */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                Recent Investigations ({filteredInvestigations.length})
              </h2>
              {filteredInvestigations.length !== investigations.length && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </button>
              )}
            </div>

            {recentInvestigations.length > 0 ? (
              <div className="space-y-4">
                {recentInvestigations.map(investigation => (
                  <InvestigationCard
                    key={investigation.id}
                    investigation={investigation}
                    onView={onViewInvestigation}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {investigations.length === 0 ? 'No investigations yet' : 'No matching investigations'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {investigations.length === 0
                    ? 'Create your first manual investigation to get started.'
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
                {investigations.length === 0 && (
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
        </>
      )}
    </div>
  );
};