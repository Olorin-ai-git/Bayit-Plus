import React from 'react';
import {
  PlusIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Investigation, InvestigationStatus } from '../types/investigation';
import { LoadingSpinner } from '../../core-ui/components/LoadingSpinner';
import { LiveMetricsDisplay } from './LiveMetricsDisplay';
import { AlertCenter } from './AlertCenter';

interface InvestigationDashboardProps {
  investigations: Investigation[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreateInvestigation: () => void;
  onViewInvestigation: (id: string) => void;
}

interface StatusCardProps {
  status: InvestigationStatus;
  count: number;
  total: number;
}

const StatusCard: React.FC<StatusCardProps> = ({ status, count, total }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'running':
        return {
          title: 'Running',
          icon: ArrowPathIcon,
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          iconColor: 'text-blue-500',
        };
      case 'completed':
        return {
          title: 'Completed',
          icon: CheckCircleIcon,
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          iconColor: 'text-green-500',
        };
      case 'failed':
        return {
          title: 'Failed',
          icon: XCircleIcon,
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          iconColor: 'text-red-500',
        };
      case 'pending':
        return {
          title: 'Pending',
          icon: ClockIcon,
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          iconColor: 'text-yellow-500',
        };
      default:
        return {
          title: status.charAt(0).toUpperCase() + status.slice(1),
          icon: ChartBarIcon,
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          iconColor: 'text-gray-500',
        };
    }
  };

  const config = getStatusConfig();
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${config.text}`}>{config.title}</p>
          <p className="text-2xl font-semibold text-gray-900">{count}</p>
          <p className="text-xs text-gray-500">{percentage}% of total</p>
        </div>
        <config.icon className={`h-8 w-8 ${config.iconColor}`} />
      </div>
    </div>
  );
};

interface RecentInvestigationProps {
  investigation: Investigation;
  onView: (id: string) => void;
}

const RecentInvestigation: React.FC<RecentInvestigationProps> = ({ investigation, onView }) => {
  const getStatusBadge = (status: InvestigationStatus) => {
    const statusConfig = {
      running: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Running' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      paused: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Paused' },
      stopped: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Stopped' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
    };

    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      critical: { bg: 'bg-red-100', text: 'text-red-800' },
      high: { bg: 'bg-orange-100', text: 'text-orange-800' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      low: { bg: 'bg-green-100', text: 'text-green-800' },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {priority.toUpperCase()}
      </span>
    );
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

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all duration-150 cursor-pointer"
      onClick={() => onView(investigation.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{investigation.title}</h4>
          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{investigation.description}</p>
        </div>
        <div className="ml-4 flex flex-col items-end space-y-1">
          {getStatusBadge(investigation.status)}
          {getPriorityBadge(investigation.priority)}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>ID: {investigation.id}</span>
          <span>{investigation.assignedAgents.length} agents</span>
          {investigation.progress && (
            <span>{investigation.progress.overall}% complete</span>
          )}
        </div>
        <span>{formatDate(investigation.updatedAt)}</span>
      </div>

      {investigation.status === 'running' && investigation.progress && (
        <div className="mt-3">
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
  );
};

export const InvestigationDashboard: React.FC<InvestigationDashboardProps> = ({
  investigations,
  isLoading,
  onRefresh,
  onCreateInvestigation,
  onViewInvestigation,
}) => {
  const getStatusCounts = () => {
    const counts: Record<InvestigationStatus, number> = {
      pending: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      stopped: 0,
      cancelled: 0,
    };

    investigations.forEach(inv => {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    });

    return counts;
  };

  const getRecentInvestigations = () => {
    return investigations
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);
  };

  const getActiveInvestigations = () => {
    return investigations.filter(inv => inv.status === 'running' || inv.status === 'pending');
  };

  const statusCounts = getStatusCounts();
  const recentInvestigations = getRecentInvestigations();
  const activeInvestigations = getActiveInvestigations();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Autonomous Investigations</h1>
          <p className="text-gray-600">AI-powered fraud detection and analysis</p>
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" message="Loading investigations..." />
        </div>
      ) : (
        <>
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatusCard status="running" count={statusCounts.running} total={investigations.length} />
            <StatusCard status="completed" count={statusCounts.completed} total={investigations.length} />
            <StatusCard status="pending" count={statusCounts.pending} total={investigations.length} />
            <StatusCard status="failed" count={statusCounts.failed} total={investigations.length} />
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Investigations</p>
                <p className="text-2xl font-semibold text-gray-900">{investigations.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Investigations</p>
                <p className="text-2xl font-semibold text-blue-600">{activeInvestigations.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-semibold text-green-600">
                  {investigations.length > 0
                    ? Math.round((statusCounts.completed / investigations.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Live Metrics */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <LiveMetricsDisplay investigations={investigations} />
          </div>

          {/* Alert Center */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <AlertCenter investigations={investigations} />
          </div>

          {/* Recent Investigations */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Recent Investigations</h2>
              <button
                onClick={() => onViewInvestigation('list')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View all →
              </button>
            </div>

            {recentInvestigations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentInvestigations.map(investigation => (
                  <RecentInvestigation
                    key={investigation.id}
                    investigation={investigation}
                    onView={onViewInvestigation}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No investigations yet</h3>
                <p className="text-gray-600 mb-4">Create your first autonomous investigation to get started.</p>
                <button
                  onClick={onCreateInvestigation}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Investigation
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};