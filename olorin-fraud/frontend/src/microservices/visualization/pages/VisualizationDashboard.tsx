/**
 * Visualization Dashboard - Production Page
 * Feature: 002-visualization-microservice
 *
 * Fully functional visualization dashboard integrating all visualization components
 * with real backend data, WebSocket updates, and investigation selection.
 *
 * @module visualization/pages/VisualizationDashboard
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VisualizationErrorBoundary } from '../components/VisualizationErrorBoundary';
import {  LazyRiskGauge, LazyNetworkGraph, LazyTimeline, LazyBarChart, LazyLineChart, LazyEKGMonitor } from '../config/lazyLoading';
import { useInvestigationData } from '../hooks/useInvestigationData';
import { ChartThemeProvider } from '../contexts/ChartThemeContext';
import type { ChartConfig } from '../types/chart.types';

interface VisualizationDashboardProps {
  investigationId?: string;
  className?: string;
}

export function VisualizationDashboard({
  investigationId: propInvestigationId,
  className = ''
}: VisualizationDashboardProps) {
  const { investigationId: routeInvestigationId } = useParams<{ investigationId: string }>();
  const navigate = useNavigate();
  
  // Filter out reserved route names that shouldn't be treated as investigation IDs
  const reservedNames = ['visualization', 'charts', 'maps', 'risk-analysis', 'reports', 'analytics', 'rag', 'investigations', 'investigations-management', 'compare'];
  const rawInvestigationId = propInvestigationId || routeInvestigationId;
  const investigationId = rawInvestigationId && !reservedNames.includes(rawInvestigationId.toLowerCase()) 
    ? rawInvestigationId 
    : undefined;

  const {
    investigation,
    riskData,
    networkData,
    timelineEvents,
    loading,
    error,
    refreshData
  } = useInvestigationData(investigationId);

  const [selectedView, setSelectedView] = useState<'overview' | 'network' | 'timeline' | 'analytics'>('overview');

  // Risk trend chart configuration
  const riskTrendConfig: ChartConfig | undefined = riskData?.history ? {
    id: 'risk-trend',
    type: 'line',
    title: 'Risk Score Trend',
    datasets: [{
      label: 'Risk Score',
      data: riskData.history.map(h => ({ x: h.timestamp, y: h.score }))
    }]
  } : undefined;

  // Risk distribution chart configuration
  const riskDistConfig: ChartConfig | undefined = riskData ? {
    id: 'risk-distribution',
    type: 'bar',
    title: 'Risk Factor Distribution',
    datasets: [{
      label: 'Risk Factors',
      data: Object.entries(riskData.factors || {}).map(([key, value]) => ({
        x: key,
        y: value as number
      }))
    }]
  } : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading visualization data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 p-6">
        <div className="max-w-md w-full bg-red-900/20 border-2 border-red-500 rounded-lg p-6 text-center">
          <p className="text-red-400 font-semibold mb-4">Failed to load investigation</p>
          <p className="text-sm text-red-300 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!investigationId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 p-6">
        <div className="max-w-md text-center">
          <p className="text-gray-400 mb-4">No investigation selected</p>
          <button
            onClick={() => navigate('/investigations')}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
          >
            Select Investigation
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChartThemeProvider>
      <VisualizationErrorBoundary>
        <div className={`visualization-dashboard min-h-screen bg-gray-950 ${className}`}>
          {/* Header */}
          <div className="border-b border-gray-800 bg-gray-900/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-100">Investigation Visualization</h1>
                <p className="text-sm text-gray-400 mt-1">
                  {investigation?.name || `Investigation ${investigationId}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={refreshData}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors text-sm"
                  aria-label="Refresh data"
                >
                  Refresh
                </button>
                <LazyEKGMonitor investigationId={investigationId} width={200} height={60} />
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex gap-2 mt-4">
              {(['overview', 'network', 'timeline', 'analytics'] as const).map(view => (
                <button
                  key={view}
                  onClick={() => setSelectedView(view)}
                  className={`px-4 py-2 rounded transition-colors text-sm font-medium ${
                    selectedView === view
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {selectedView === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Risk Gauge */}
                {riskData && (
                  <div className="lg:col-span-1">
                    <LazyRiskGauge
                      score={riskData.score}
                      severity={riskData.severity}
                      size={250}
                      showLabel={true}
                    />
                  </div>
                )}

                {/* Charts */}
                <div className="lg:col-span-2 space-y-6">
                  {riskTrendConfig && <LazyLineChart config={riskTrendConfig} />}
                  {riskDistConfig && <LazyBarChart config={riskDistConfig} />}
                </div>
              </div>
            )}

            {selectedView === 'network' && networkData && (
              <LazyNetworkGraph
                investigationId={investigationId}
                nodes={networkData.nodes}
                edges={networkData.edges}
                width={window.innerWidth - 100}
                height={window.innerHeight - 300}
              />
            )}

            {selectedView === 'timeline' && timelineEvents && (
              <LazyTimeline
                investigationId={investigationId}
                events={timelineEvents}
                virtualization={true}
              />
            )}

            {selectedView === 'analytics' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-corporate-textPrimary">Analytics</h3>
                  {investigationId && (
                    <button
                      onClick={() => {
                        if (window.olorin?.navigate) {
                          window.olorin.navigate(`/analytics?id=${investigationId}`);
                        } else {
                          window.location.href = `/analytics?id=${investigationId}`;
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-corporate-info hover:bg-corporate-info/90 text-white font-medium transition-all duration-200"
                    >
                      View Full Analytics
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {riskTrendConfig && <LazyLineChart config={riskTrendConfig} />}
                  {riskDistConfig && <LazyBarChart config={riskDistConfig} />}
                </div>
              </div>
            )}
          </div>
        </div>
      </VisualizationErrorBoundary>
    </ChartThemeProvider>
  );
}
