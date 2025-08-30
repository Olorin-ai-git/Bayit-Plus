/**
 * Performance Dashboard Component
 * 
 * Demonstrates the implemented performance optimizations and provides
 * real-time monitoring of frontend and backend performance metrics.
 */

import React, { useState, useEffect, memo } from 'react';
import { 
  useOptimizedCallback, 
  useRenderPerformance, 
  useOptimizedMemo 
} from '../hooks/usePerformanceOptimization';
import { optimizedApiService } from '../services/optimized-api-service';

interface PerformanceMetrics {
  frontend: {
    renderCount: number;
    averageRenderTime: number;
    cacheHitRate: number;
    bundleLoadTime: number;
  };
  backend: {
    averageResponseTime: number;
    cacheHitRate: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  api: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

const MetricCard = memo<{
  title: string;
  value: string | number;
  unit?: string;
  status: 'good' | 'warning' | 'critical';
  description?: string;
}>(({ title, value, unit, status, description }) => {
  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    critical: 'bg-red-50 border-red-200 text-red-800'
  };

  return (
    <div className={`p-4 rounded-lg border ${statusColors[status]}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {typeof value === 'number' ? value.toFixed(1) : value}
            {unit && <span className="text-sm ml-1">{unit}</span>}
          </div>
          {description && (
            <div className="text-xs opacity-75 mt-1">{description}</div>
          )}
        </div>
      </div>
    </div>
  );
});

MetricCard.displayName = 'MetricCard';

export const PerformanceDashboard = memo(() => {
  const renderMetrics = useRenderPerformance('PerformanceDashboard');
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch performance data
  const fetchPerformanceData = useOptimizedCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get backend metrics
      const backendMetrics = await optimizedApiService.get('/performance/metrics', {
        cacheTTL: 10000, // 10 second cache
        backgroundRefresh: true
      });

      // Get API service metrics
      const apiMetrics = optimizedApiService.getPerformanceMetrics();

      // Combine with frontend metrics
      const metrics: PerformanceMetrics = {
        frontend: {
          renderCount: renderMetrics.renderCount,
          averageRenderTime: renderMetrics.averageRenderTime,
          cacheHitRate: apiMetrics.cacheStats.hitRate,
          bundleLoadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
        },
        backend: {
          averageResponseTime: backendMetrics.request_metrics?.avg_response_time_ms || 0,
          cacheHitRate: backendMetrics.cache_metrics?.hit_rate || 0,
          memoryUsage: backendMetrics.system_metrics?.memory_usage_percent || 0,
          cpuUsage: backendMetrics.system_metrics?.cpu_usage_percent || 0
        },
        api: {
          totalRequests: backendMetrics.request_metrics?.total_requests || 0,
          errorRate: backendMetrics.request_metrics?.error_rate || 0,
          averageResponseTime: apiMetrics.averageResponseTime
        }
      };

      setPerformanceData(metrics);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  }, [], 'fetch-performance-data');

  // Auto-refresh performance data
  useEffect(() => {
    fetchPerformanceData();
    
    const interval = setInterval(fetchPerformanceData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPerformanceData]);

  // Memoized status calculations
  const frontendStatus = useOptimizedMemo(() => {
    if (!performanceData) return 'good';
    
    const { frontend } = performanceData;
    
    if (frontend.averageRenderTime > 16) return 'critical'; // Slower than 60fps
    if (frontend.averageRenderTime > 10) return 'warning';
    return 'good';
  }, [performanceData], 'frontend-status');

  const backendStatus = useOptimizedMemo(() => {
    if (!performanceData) return 'good';
    
    const { backend } = performanceData;
    
    if (backend.averageResponseTime > 1000 || backend.memoryUsage > 90) return 'critical';
    if (backend.averageResponseTime > 500 || backend.memoryUsage > 75) return 'warning';
    return 'good';
  }, [performanceData], 'backend-status');

  const cacheStatus = useOptimizedMemo(() => {
    if (!performanceData) return 'good';
    
    const avgHitRate = (performanceData.frontend.cacheHitRate + performanceData.backend.cacheHitRate) / 2;
    
    if (avgHitRate < 0.3) return 'critical';
    if (avgHitRate < 0.6) return 'warning';
    return 'good';
  }, [performanceData], 'cache-status');

  if (loading && !performanceData) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Performance Data Error</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchPerformanceData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
          <button
            onClick={fetchPerformanceData}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {performanceData && (
        <>
          {/* Frontend Performance */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Frontend Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Render Performance"
                value={performanceData.frontend.averageRenderTime}
                unit="ms"
                status={frontendStatus}
                description={`${performanceData.frontend.renderCount} renders`}
              />
              <MetricCard
                title="Frontend Cache Hit Rate"
                value={(performanceData.frontend.cacheHitRate * 100)}
                unit="%"
                status={performanceData.frontend.cacheHitRate > 0.7 ? 'good' : performanceData.frontend.cacheHitRate > 0.5 ? 'warning' : 'critical'}
              />
              <MetricCard
                title="Bundle Load Time"
                value={performanceData.frontend.bundleLoadTime}
                unit="ms"
                status={performanceData.frontend.bundleLoadTime < 2000 ? 'good' : performanceData.frontend.bundleLoadTime < 5000 ? 'warning' : 'critical'}
              />
              <MetricCard
                title="API Response Time"
                value={performanceData.api.averageResponseTime}
                unit="ms"
                status={performanceData.api.averageResponseTime < 200 ? 'good' : performanceData.api.averageResponseTime < 500 ? 'warning' : 'critical'}
              />
            </div>
          </section>

          {/* Backend Performance */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Backend Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="API Response Time"
                value={performanceData.backend.averageResponseTime}
                unit="ms"
                status={backendStatus}
              />
              <MetricCard
                title="Backend Cache Hit Rate"
                value={(performanceData.backend.cacheHitRate * 100)}
                unit="%"
                status={performanceData.backend.cacheHitRate > 0.8 ? 'good' : performanceData.backend.cacheHitRate > 0.6 ? 'warning' : 'critical'}
              />
              <MetricCard
                title="Memory Usage"
                value={performanceData.backend.memoryUsage}
                unit="%"
                status={performanceData.backend.memoryUsage < 70 ? 'good' : performanceData.backend.memoryUsage < 85 ? 'warning' : 'critical'}
              />
              <MetricCard
                title="CPU Usage"
                value={performanceData.backend.cpuUsage}
                unit="%"
                status={performanceData.backend.cpuUsage < 70 ? 'good' : performanceData.backend.cpuUsage < 85 ? 'warning' : 'critical'}
              />
            </div>
          </section>

          {/* System Overview */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">System Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Total API Requests"
                value={performanceData.api.totalRequests}
                status="good"
              />
              <MetricCard
                title="Error Rate"
                value={performanceData.api.errorRate}
                unit="%"
                status={performanceData.api.errorRate < 1 ? 'good' : performanceData.api.errorRate < 5 ? 'warning' : 'critical'}
              />
              <MetricCard
                title="Overall Cache Status"
                value={cacheStatus === 'good' ? 'Optimal' : cacheStatus === 'warning' ? 'Needs Attention' : 'Critical'}
                status={cacheStatus}
              />
            </div>
          </section>

          {/* Performance Insights */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Performance Insights</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Optimization Status</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Multi-layer caching active
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Request deduplication enabled
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Component memoization optimized
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Bundle optimization active
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Real-time monitoring enabled
                </li>
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
});

PerformanceDashboard.displayName = 'PerformanceDashboard';

export default PerformanceDashboard;