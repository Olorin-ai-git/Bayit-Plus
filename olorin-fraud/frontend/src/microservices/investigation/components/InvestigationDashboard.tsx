import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useInvestigationContext } from '../contexts/InvestigationContext';
import { useInvestigationStatistics } from '../hooks/useInvestigation';
import { Investigation } from '../services/investigationService';

// Local interface for dashboard-specific properties
interface DashboardInvestigation extends Investigation {
  assignedAgents?: string[]; // Dashboard-specific property
  dashboardProgress?: {
    overall: number;
    steps: { name: string; completed: boolean; }[];
  };
}

interface InvestigationDashboardProps {
  className?: string;
}

const InvestigationDashboard: React.FC<InvestigationDashboardProps> = ({
  className = ""
}) => {
  const { state, actions } = useInvestigationContext();
  const { statistics, loading: statsLoading } = useInvestigationStatistics('week');

  // Local state for component
  const [investigations, setInvestigations] = useState<DashboardInvestigation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const mockInvestigations: DashboardInvestigation[] = [
      {
        id: 'inv-001',
        title: 'Payment Fraud Investigation',
        description: 'Investigating suspicious payment patterns from user account 12345',
        type: 'fraud' as const,
        status: 'in_progress',
        priority: 'high',
        assignedAgents: ['Location Agent', 'Device Agent', 'Network Agent'],
        assignee: 'Investigation Team',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
        progress: 65,
        dashboardProgress: { overall: 65, steps: [
          { name: 'Data Collection', completed: true },
          { name: 'Pattern Analysis', completed: true },
          { name: 'Risk Assessment', completed: false }
        ]}
      },
      {
        id: 'inv-002',
        title: 'Account Takeover Analysis',
        description: 'Multi-factor authentication bypass attempt detected',
        type: 'account_takeover' as const,
        status: 'completed',
        priority: 'critical',
        assignedAgents: ['Device Agent', 'Log Agent'],
        assignee: 'Security Team',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 900000).toISOString(),
        progress: 100,
        dashboardProgress: { overall: 100, steps: [
          { name: 'Evidence Collection', completed: true },
          { name: 'Threat Analysis', completed: true },
          { name: 'Report Generation', completed: true }
        ]}
      },
      {
        id: 'inv-003',
        title: 'Identity Verification Review',
        description: 'Reviewing identity verification documents for compliance',
        type: 'compliance' as const,
        status: 'pending',
        priority: 'medium',
        assignedAgents: ['Document Agent'],
        assignee: 'Compliance Team',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
        progress: 0,
      }
    ];

    setTimeout(() => {
      setInvestigations(mockInvestigations);
      setIsLoading(false);
    }, 1000);
  }, []);

  const getStatusCounts = () => {
    const counts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    investigations.forEach(inv => {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    });

    return counts;
  };

  const getStatusBadge = (status: Investigation['status']) => {
    const statusConfig = {
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Progress' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
    };

    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: Investigation['priority']) => {
    const priorityConfig = {
      critical: { bg: 'bg-red-100', text: 'text-red-800' },
      high: { bg: 'bg-orange-100', text: 'text-orange-800' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      low: { bg: 'bg-green-100', text: 'text-green-800' },
    };

    const config = priorityConfig[priority];
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

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleCreateInvestigation = () => {
    console.log('Create new investigation');
  };

  const handleViewInvestigation = (id: string) => {
    console.log('View investigation:', id);
  };

  const statusCounts = getStatusCounts();

  return (
    <div className={`investigation-dashboard p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investigation Dashboard</h1>
          <p className="text-gray-600">Manage and monitor fraud investigations</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleCreateInvestigation}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Investigation
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading investigations...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">In Progress</p>
                  <p className="text-2xl font-semibold text-gray-900">{statusCounts.in_progress}</p>
                </div>
                <ArrowPathIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">{statusCounts.completed}</p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">Pending</p>
                  <p className="text-2xl font-semibold text-gray-900">{statusCounts.pending}</p>
                </div>
                <ClockIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Failed</p>
                  <p className="text-2xl font-semibold text-gray-900">{statusCounts.failed}</p>
                </div>
                <XCircleIcon className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Investigations</p>
                  <p className="text-2xl font-semibold text-gray-900">{investigations.length}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <ArrowPathIcon className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Investigations</p>
                  <p className="text-2xl font-semibold text-blue-600">{statusCounts.in_progress + statusCounts.pending}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="h-8 w-8 text-green-400" />
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
          </div>

          {/* Recent Investigations */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Recent Investigations</h2>
              <button
                onClick={() => handleViewInvestigation('list')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View all →
              </button>
            </div>

            {investigations.length > 0 ? (
              <div className="space-y-4">
                {investigations.map(investigation => (
                  <div
                    key={investigation.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all duration-150 cursor-pointer"
                    onClick={() => handleViewInvestigation(investigation.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{investigation.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{investigation.description}</p>
                      </div>
                      <div className="ml-4 flex flex-col items-end space-y-1">
                        {getStatusBadge(investigation.status)}
                        {getPriorityBadge(investigation.priority)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <DocumentTextIcon className="h-3 w-3 mr-1" />
                          ID: {investigation.id}
                        </span>
                        <span className="flex items-center">
                          <UserGroupIcon className="h-3 w-3 mr-1" />
                          {investigation.assignedAgents?.length || 0} agents
                        </span>
                        {investigation.dashboardProgress && (
                          <span>{investigation.dashboardProgress.overall}% complete</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>{formatDate(investigation.updatedAt)}</span>
                        <EyeIcon className="h-3 w-3" />
                      </div>
                    </div>

                    {investigation.status === 'in_progress' && investigation.dashboardProgress && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{investigation.dashboardProgress.overall}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${investigation.dashboardProgress.overall}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No investigations yet</h3>
                <p className="text-gray-600 mb-4">Create your first investigation to get started.</p>
                <button
                  onClick={handleCreateInvestigation}
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

export default InvestigationDashboard;