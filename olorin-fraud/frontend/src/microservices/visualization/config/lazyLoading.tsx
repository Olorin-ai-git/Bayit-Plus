/**
 * Lazy Loading Configuration for Visualization Microservice
 * Feature: 002-visualization-microservice
 *
 * Implements code splitting and dynamic imports for optimal bundle size.
 * Heavy components (Chart.js, D3.js) are loaded on-demand to improve initial load time.
 *
 * @module visualization/config/lazyLoading
 */

import React, { lazy, Suspense, ComponentType } from 'react';

/**
 * Loading fallback component
 */
function LoadingFallback({ message = 'Loading visualization...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[200px] bg-gray-900/50 border border-gray-700 rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" aria-hidden="true" />
        <p className="text-sm text-gray-400">{message}</p>
      </div>
    </div>
  );
}

/**
 * Higher-order component for lazy loading with Suspense
 */
function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  loadingMessage?: string
) {
  const LazyComponent = lazy(importFn);

  return (props: P) => (
    <Suspense fallback={<LoadingFallback message={loadingMessage} />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Risk Visualization Components (Lazy Loaded)
export const LazyRiskGauge = withLazyLoading(
  () => import('../components/risk/RiskGauge').then(m => ({ default: m.RiskGauge })),
  'Loading risk gauge...'
);

// Network Visualization Components (Lazy Loaded - Heavy D3.js)
export const LazyNetworkGraph = withLazyLoading(
  () => import('../components/network/NetworkGraph').then(m => ({ default: m.NetworkGraph })),
  'Loading network graph...'
);

// Geographic Visualization Components (Lazy Loaded - Heavy Google Maps)
export const LazyLocationMap = withLazyLoading(
  () => import('../components/maps/LocationMap').then(m => ({ default: m.LocationMap || m.default })),
  'Loading location map...'
);

// Timeline Components (Lazy Loaded - Heavy with virtualization)
export const LazyTimeline = withLazyLoading(
  () => import('../components/timeline/Timeline').then(m => ({ default: m.Timeline })),
  'Loading timeline...'
);

export const LazyTimelineEvent = withLazyLoading(
  () => import('../components/timeline/TimelineEvent').then(m => ({ default: m.TimelineEvent || m.default })),
  'Loading event details...'
);

// Real-Time Monitoring Components (Lazy Loaded)
export const LazyEKGMonitor = withLazyLoading(
  () => import('../components/monitoring/EKGMonitor').then(m => ({ default: m.EKGMonitor })),
  'Loading EKG monitor...'
);

export const LazyTPSSparkline = withLazyLoading(
  () => import('../components/monitoring/TPSSparkline').then(m => ({ default: m.TPSSparkline || m.default })),
  'Loading TPS sparkline...'
);

export const LazyRadarVisualization = withLazyLoading(
  () => import('../components/monitoring/RadarVisualization').then(m => ({ default: m.RadarVisualization || m.default })),
  'Loading radar visualization...'
);

// Chart Components (Lazy Loaded - Heavy Chart.js)
// Note: Charts use named exports, so we need to map them to default
export const LazyBarChart = withLazyLoading(
  () => import('../components/charts/BarChart').then(m => ({ default: m.BarChart })),
  'Loading bar chart...'
);

export const LazyLineChart = withLazyLoading(
  () => import('../components/charts/LineChart').then(m => ({ default: m.LineChart })),
  'Loading line chart...'
);

export const LazyPieChart = withLazyLoading(
  () => import('../components/charts/PieChart').then(m => ({ default: m.PieChart })),
  'Loading pie chart...'
);

export const LazyScatterChart = withLazyLoading(
  () => import('../components/charts/ScatterChart').then(m => ({ default: m.ScatterChart })),
  'Loading scatter chart...'
);

export const LazyDashboardGrid = withLazyLoading(
  () => import('../components/charts/DashboardGrid').then(m => ({ default: m.DashboardGrid })),
  'Loading dashboard grid...'
);

/**
 * Preload function for critical components
 * Call this on route change or user interaction to preload components
 */
export function preloadCriticalComponents(): void {
  // Preload most commonly used components
  import('../components/risk/RiskGauge');
  import('../components/network/NetworkGraph');
  import('../components/timeline/Timeline');
}

/**
 * Preload function for chart components
 */
export function preloadChartComponents(): void {
  import('../components/charts/BarChart');
  import('../components/charts/LineChart');
  import('../components/charts/PieChart');
}

/**
 * Preload function for monitoring components
 */
export function preloadMonitoringComponents(): void {
  import('../components/monitoring/EKGMonitor');
  import('../components/monitoring/TPSSparkline');
  import('../components/monitoring/RadarVisualization');
}

/**
 * Preload function for geographic components
 */
export function preloadGeographicComponents(): void {
  import('../components/maps/LocationMap');
}

/**
 * Bundle optimization hints for Webpack
 * Add to webpack.config.js optimization section
 */
export const WEBPACK_OPTIMIZATION_CONFIG = {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      // D3.js vendor chunk
      d3: {
        test: /[\\/]node_modules[\\/](d3|d3-.*)/,
        name: 'vendor-d3',
        priority: 20,
        reuseExistingChunk: true
      },
      // Chart.js vendor chunk
      chartjs: {
        test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)/,
        name: 'vendor-chartjs',
        priority: 20,
        reuseExistingChunk: true
      },
      // Google Maps vendor chunk
      googlemaps: {
        test: /[\\/]node_modules[\\/](@react-google-maps|@googlemaps)/,
        name: 'vendor-googlemaps',
        priority: 20,
        reuseExistingChunk: true
      },
      // Visualization common chunk
      visualizationCommon: {
        test: /[\\/]src[\\/]microservices[\\/]visualization[\\/](utils|types|hooks)/,
        name: 'visualization-common',
        priority: 10,
        minChunks: 2,
        reuseExistingChunk: true
      }
    }
  }
};
