/**
 * AnomalyHubPage Component - Main page for viewing and filtering anomalies
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { AnalyticsHeader } from '../components/common/AnalyticsHeader';
import { AnomalyFilters } from '../components/anomaly/AnomalyFilters';
import { AnomalyTable } from '../components/anomaly/AnomalyTable';
import { AnomalyDetails } from '../components/anomaly/AnomalyDetails';
import { KpiTile } from '../components/common/KpiTile';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useAnomalies } from '../hooks/useAnomalies';
import { useAnomalyWebSocket } from '../hooks/useAnomalyWebSocket';
import { useInvestigation } from '../hooks/useInvestigation';
import type { AnomalyEvent, AnomalyFilter } from '../types/anomaly';

export const AnomalyHubPage: React.FC = () => {
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyEvent | null>(null);
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { anomalies, loading, error, total, filters, updateFilters, refresh } =
    useAnomalies({ limit: 100, autoRefresh: false });

  const { createInvestigation, isCreating } = useInvestigation({
    onInvestigationCreated: (response) => {
      // Refresh anomalies to show updated investigation_id
      refresh();
      // Navigate to investigation progress page
      const targetUrl = `/investigation/progress?id=${response.investigation_id}`;
      console.log('[AnomalyHubPage] Navigating to:', targetUrl);
      // Try window.olorin.navigate first (if available), fallback to window.location.href
      if (window.olorin?.navigate && typeof window.olorin.navigate === 'function') {
        window.olorin.navigate(targetUrl);
      } else {
        // Fallback to window.location.href for shell-level navigation
        window.location.href = targetUrl;
      }
    },
  });

  // Stable refresh function that doesn't change
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const handleAnomalyUpdate = useCallback((newAnomaly: AnomalyEvent) => {
    refreshRef.current();
  }, []); // No dependencies - uses ref

  // Memoize filters string to prevent unnecessary reconnections
  // Only reconnect when actual filter values change, not object reference
  const filtersString = useMemo(() => {
    // Create a stable filter object with only defined values
    const stableFilters: AnomalyFilter = {};
    if (filters.severity) stableFilters.severity = filters.severity;
    if (filters.metric) stableFilters.metric = filters.metric;
    if (filters.detector_id) stableFilters.detector_id = filters.detector_id;
    if (filters.status) stableFilters.status = filters.status;
    if (filters.window_start) stableFilters.window_start = filters.window_start;
    if (filters.window_end) stableFilters.window_end = filters.window_end;
    if (filters.min_score) stableFilters.min_score = filters.min_score ? parseFloat(filters.min_score) : undefined;
    if (filters.max_score) stableFilters.max_score = filters.max_score ? parseFloat(filters.max_score) : undefined;
    if (filters.limit) stableFilters.limit = parseInt(filters.limit || '100');
    if (filters.offset) stableFilters.offset = parseInt(filters.offset || '0');
    return JSON.stringify(stableFilters);
  }, [
    filters.severity,
    filters.metric,
    filters.detector_id,
    filters.status,
    filters.window_start,
    filters.window_end,
    filters.min_score,
    filters.max_score,
    filters.limit,
    filters.offset,
  ]);

  // Convert back to filter object only when string changes
  const memoizedFilters = useMemo(() => {
    if (!filtersString || filtersString === '{}') return undefined;
    return JSON.parse(filtersString) as AnomalyFilter;
  }, [filtersString]);

  useAnomalyWebSocket(handleAnomalyUpdate, {
    filters: memoizedFilters,
    enabled: true,
    throttleMs: 2000,
  });

  const kpis = useMemo(() => {
    const critical = anomalies.filter((a) => a.severity === 'critical').length;
    const warn = anomalies.filter((a) => a.severity === 'warn').length;
    const info = anomalies.filter((a) => a.severity === 'info').length;

    const topCohorts = anomalies.reduce((acc, anomaly) => {
      const cohortKey = JSON.stringify(anomaly.cohort);
      acc[cohortKey] = (acc[cohortKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCohort = Object.entries(topCohorts)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      total: anomalies.length,
      critical,
      warn,
      info,
      topCohort: topCohort ? JSON.parse(topCohort[0]) : null,
      topCohortCount: topCohort ? topCohort[1] : 0,
    };
  }, [anomalies]);

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleInvestigate = async (anomaly: AnomalyEvent) => {
    await createInvestigation(anomaly.id);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-corporate-bgPrimary p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <AnalyticsHeader
            title="Anomaly Hub"
            subtitle="Review detected anomalies and triage incidents"
          />

          <AnomalyFilters onFilterChange={updateFilters} />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiTile
              label="Total Anomalies"
              value={kpis.total}
              description={`${total} total detected`}
            />
            <KpiTile
              label="Critical"
              value={kpis.critical}
              description="Requires immediate attention"
              trend={kpis.critical > 0 ? 'up' : 'neutral'}
              trendValue={kpis.critical > 0 ? `${kpis.critical}` : '0'}
            />
            <KpiTile
              label="Warnings"
              value={kpis.warn}
              description="Monitor closely"
            />
            <KpiTile
              label="Info"
              value={kpis.info}
              description="Low priority"
            />
          </div>

          {loading && <SkeletonLoader variant="table" rows={5} />}

          {error && (
            <EmptyState
              title="Error Loading Anomalies"
              message={error.message}
              actionLabel="Retry"
              onAction={refresh}
            />
          )}

          {!loading && !error && anomalies.length === 0 && (
            <EmptyState
              title="No Anomalies Found"
              message="No anomalies match the current filters. Try adjusting your filters or check back later."
              actionLabel="Clear Filters"
              onAction={() => updateFilters({})}
            />
          )}

          {!loading && !error && anomalies.length > 0 && (
            <AnomalyTable
              anomalies={anomalies}
              onRowClick={setSelectedAnomaly}
              onInvestigate={handleInvestigate}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          )}

          <AnomalyDetails
            anomaly={selectedAnomaly}
            onClose={() => setSelectedAnomaly(null)}
            onInvestigate={handleInvestigate}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

