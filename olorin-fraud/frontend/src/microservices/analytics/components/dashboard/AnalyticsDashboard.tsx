/**
 * Analytics Dashboard Component - Main dashboard page.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useFilters } from '../../hooks/useFilters';
import { LoadingState } from '../common/LoadingState';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { EmptyState } from '../common/EmptyState';
import { AnalyticsHeader } from '../common/AnalyticsHeader';
import KPITiles from './KPITiles';
import TrendGraphs from './TrendGraphs';
import Filters from './Filters';

const AnalyticsDashboard: React.FC = () => {
  const { filters } = useFilters();
  const { data, loading, error } = useAnalytics(filters);

  if (loading) {
    return <LoadingState message="Loading analytics dashboard..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Dashboard"
        message={error.message}
        actionLabel="Retry"
        onAction={() => window.location.reload()}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="No Data Available"
        message="No analytics data found for the selected time period."
      />
    );
  }

  const handleBackToInvestigation = () => {
    if (filters.investigationId) {
      if (window.olorin?.navigate) {
        window.olorin.navigate(`/investigations?id=${filters.investigationId}`);
      } else {
        window.location.href = `/investigations?id=${filters.investigationId}`;
      }
    }
  };

  const handleBackToVisualization = () => {
    if (filters.investigationId) {
      if (window.olorin?.navigate) {
        window.olorin.navigate(`/visualization/${filters.investigationId}`);
      } else {
        window.location.href = `/visualization/${filters.investigationId}`;
      }
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-corporate-bgPrimary p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <AnalyticsHeader
            title="Analytics Dashboard"
            subtitle="Fraud detection performance metrics and insights"
          />

          {filters.investigationId && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleBackToInvestigation}
                className="px-4 py-2 rounded-lg bg-corporate-bgSecondary hover:bg-corporate-bgTertiary text-corporate-textPrimary border border-corporate-border font-medium transition-all duration-200"
              >
                ← Back to Investigation
              </button>
              <button
                onClick={handleBackToVisualization}
                className="px-4 py-2 rounded-lg bg-corporate-bgSecondary hover:bg-corporate-bgTertiary text-corporate-textPrimary border border-corporate-border font-medium transition-all duration-200"
              >
                ← Back to Visualization
              </button>
            </div>
          )}

          {/* Quick Access Cards for Anomaly Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Link
              to="/analytics/anomalies"
              className="glass-md rounded-lg border border-corporate-borderPrimary/40 p-6 hover:border-corporate-accentPrimary/60 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-corporate-textPrimary group-hover:text-corporate-accentPrimary transition-colors">
                    Anomaly Hub
                  </h3>
                  <p className="text-sm text-corporate-textSecondary">
                    View and investigate detected anomalies
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/analytics/detectors"
              className="glass-md rounded-lg border border-corporate-borderPrimary/40 p-6 hover:border-corporate-accentPrimary/60 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-corporate-textPrimary group-hover:text-corporate-accentPrimary transition-colors">
                    Detector Studio
                  </h3>
                  <p className="text-sm text-corporate-textSecondary">
                    Create and configure anomaly detectors
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/analytics/replay"
              className="glass-md rounded-lg border border-corporate-borderPrimary/40 p-6 hover:border-corporate-accentPrimary/60 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-corporate-textPrimary group-hover:text-corporate-accentPrimary transition-colors">
                    Replay Studio
                  </h3>
                  <p className="text-sm text-corporate-textSecondary">
                    Replay and compare detection scenarios
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <Filters filters={filters} />

          <KPITiles kpis={data.kpis} />

          <TrendGraphs trends={data.trends} />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default AnalyticsDashboard;

