import React, { useState, useEffect } from 'react';
import { Investigation, InvestigationStatsResponse } from '../types';
import { useServices } from '../services';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../../shared/components/ErrorAlert';
import { InvestigationList } from './InvestigationList';
import { InvestigationStats } from './InvestigationStats';
import { CreateInvestigationModal } from './CreateInvestigationModal';

interface InvestigationDashboardProps {
  className?: string;
}

export const InvestigationDashboard: React.FC<InvestigationDashboardProps> = ({
  className = ''
}) => {
  const { investigation: investigationService } = useServices();
  const [stats, setStats] = useState<InvestigationStatsResponse | null>(null);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, investigationsResponse] = await Promise.all([
        investigationService.getStats(),
        investigationService.list({ page: 1, per_page: 10, sort_by: 'updated_at', sort_order: 'desc' })
      ]);

      setStats(statsResponse);
      setInvestigations(investigationsResponse.investigations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleInvestigationCreated = (investigation: Investigation) => {
    setInvestigations(prev => [investigation, ...prev]);
    setRefreshTrigger(prev => prev + 1);
    setShowCreateModal(false);
  };

  const handleInvestigationUpdated = (updatedInvestigation: Investigation) => {
    setInvestigations(prev =>
      prev.map(inv => inv.id === updatedInvestigation.id ? updatedInvestigation : inv)
    );
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorAlert
        message={error}
        onRetry={() => {
          setError(null);
          loadDashboardData();
        }}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Investigation Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor and manage your security investigations
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent
                     text-sm font-medium rounded-md text-white bg-blue-600
                     hover:bg-blue-700 focus:outline-none focus:ring-2
                     focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            New Investigation
          </button>
        </div>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <InvestigationStats
          stats={stats}
          onRefresh={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {/* Recent Investigations */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              Recent Investigations
            </h2>
            <button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300
                       text-sm font-medium rounded-md text-gray-700 bg-white
                       hover:bg-gray-50 focus:outline-none focus:ring-2
                       focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg
                className="-ml-0.5 mr-1.5 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <InvestigationList
          investigations={investigations}
          onInvestigationUpdate={handleInvestigationUpdated}
          compact={true}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">
                Active Investigations
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.active_investigations || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">
                Completed Today
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.completed_today || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">
                Avg. Completion Time
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                {stats ? Math.round(stats.average_completion_time / 60) : 0}m
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Investigation Modal */}
      {showCreateModal && (
        <CreateInvestigationModal
          onClose={() => setShowCreateModal(false)}
          onInvestigationCreated={handleInvestigationCreated}
        />
      )}
    </div>
  );
};