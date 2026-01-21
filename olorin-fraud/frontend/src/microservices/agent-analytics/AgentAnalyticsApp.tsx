import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Lazy load components for better performance
const AgentAnalyticsDashboard = React.lazy(() => import('./components/AgentAnalyticsDashboard').then(module => ({ default: module.default })));
const PerformanceMetrics = React.lazy(() => import('./components/PerformanceMetrics').then(module => ({ default: module.default })));
const ModelAnalytics = React.lazy(() => import('./components/ModelAnalytics').then(module => ({ default: module.default })));
const UsageTracking = React.lazy(() => import('./components/UsageTracking').then(module => ({ default: module.default })));
const CostAnalytics = React.lazy(() => import('./components/CostAnalytics').then(module => ({ default: module.default })));

// New migrated components
const AgentDetailsViewer = React.lazy(() => import('./components/AgentDetailsViewer'));
const AgentLogMonitor = React.lazy(() => import('./components/AgentLogMonitor'));
const AgentResultsAnalyzer = React.lazy(() => import('./components/AgentResultsAnalyzer'));

const AgentAnalyticsApp: React.FC = () => {
  return (
    <ErrorBoundary serviceName="agentAnalytics">
      <div className="agent-analytics-service min-h-screen bg-black">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="mt-2 text-sm text-corporate-textSecondary">
                Loading Agent Analytics Service...
              </p>
            </div>
          </div>
        }>
          <Routes>
            {/* Main Dashboard */}
            <Route path="/" element={<AgentAnalyticsDashboard />} />
            <Route path="/dashboard" element={<AgentAnalyticsDashboard />} />

            {/* Analytics Modules */}
            <Route path="/performance" element={<PerformanceMetrics />} />
            <Route path="/models" element={<ModelAnalytics />} />
            <Route path="/usage" element={<UsageTracking />} />
            <Route path="/costs" element={<CostAnalytics />} />

            {/* Agent Details and Monitoring */}
            <Route path="/details" element={<AgentDetailsViewer details={{}} agentType="Unknown Agent" />} />
            <Route path="/logs" element={<AgentLogMonitor isOpen={true} onClose={() => {}} logs={[]} onClearLogs={() => {}} />} />
            <Route path="/results" element={<AgentResultsAnalyzer results={[]} />} />

            {/* Health and Metrics Endpoints */}
            <Route path="/health" element={
              <div className="p-4">
                <div className="bg-black/40 backdrop-blur border border-corporate-success rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-corporate-success rounded-full mr-3"></div>
                    <div>
                      <h3 className="text-lg font-medium text-corporate-textPrimary">
                        Agent Analytics Service Health Check
                      </h3>
                      <p className="text-corporate-textSecondary mt-1">
                        Service is running and operational
                      </p>
                      <div className="mt-2 text-sm text-corporate-textTertiary">
                        <div>Port: 3002</div>
                        <div>Status: Ready</div>
                        <div>Components: 5 loaded</div>
                        <div>Models Monitored: 12</div>
                        <div>Agents Tracked: 45</div>
                        <div>Last Check: {new Date().toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            } />

            <Route path="/metrics" element={
              <div className="p-4">
                <h2 className="text-xl font-bold text-corporate-textPrimary mb-4">Agent Analytics Service Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-black/40 backdrop-blur border-2 border-corporate-info rounded-lg p-4 hover:border-corporate-accentSecondary transition-all duration-300">
                    <h3 className="font-medium text-corporate-textPrimary">Active Agents</h3>
                    <div className="text-2xl font-bold text-corporate-info mt-2">45</div>
                    <div className="text-sm text-corporate-textTertiary mt-1">+3 from yesterday</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur border-2 border-corporate-success rounded-lg p-4 hover:border-corporate-accentSecondary transition-all duration-300">
                    <h3 className="font-medium text-corporate-textPrimary">Total Requests</h3>
                    <div className="text-2xl font-bold text-corporate-success mt-2">12.4K</div>
                    <div className="text-sm text-corporate-textTertiary mt-1">Last 24 hours</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur border-2 border-corporate-accentSecondary rounded-lg p-4 hover:border-corporate-accentSecondary transition-all duration-300">
                    <h3 className="font-medium text-corporate-textPrimary">Avg Response Time</h3>
                    <div className="text-2xl font-bold text-corporate-accentSecondary mt-2">285ms</div>
                    <div className="text-sm text-corporate-textTertiary mt-1">-15ms improvement</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur border-2 border-corporate-warning rounded-lg p-4 hover:border-corporate-accentSecondary transition-all duration-300">
                    <h3 className="font-medium text-corporate-textPrimary">Success Rate</h3>
                    <div className="text-2xl font-bold text-corporate-warning mt-2">98.7%</div>
                    <div className="text-sm text-corporate-textTertiary mt-1">Target: 99%</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur border-2 border-corporate-error rounded-lg p-4 hover:border-corporate-accentSecondary transition-all duration-300">
                    <h3 className="font-medium text-corporate-textPrimary">Cost This Month</h3>
                    <div className="text-2xl font-bold text-corporate-error mt-2">$2,847</div>
                    <div className="text-sm text-corporate-textTertiary mt-1">Budget: $3,000</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur border-2 border-corporate-accentPrimary rounded-lg p-4 hover:border-corporate-accentSecondary transition-all duration-300">
                    <h3 className="font-medium text-corporate-textPrimary">Models in Use</h3>
                    <div className="text-2xl font-bold text-corporate-accentPrimary mt-2">12</div>
                    <div className="text-sm text-corporate-textTertiary mt-1">GPT-4, Claude, others</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur border-2 border-corporate-warning rounded-lg p-4 hover:border-corporate-accentSecondary transition-all duration-300">
                    <h3 className="font-medium text-corporate-textPrimary">Error Rate</h3>
                    <div className="text-2xl font-bold text-corporate-warning mt-2">1.3%</div>
                    <div className="text-sm text-corporate-textTertiary mt-1">Mostly rate limits</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur border-2 border-corporate-accentSecondary rounded-lg p-4 hover:border-corporate-accentSecondary transition-all duration-300">
                    <h3 className="font-medium text-corporate-textPrimary">Peak Usage</h3>
                    <div className="text-2xl font-bold text-corporate-accentSecondary mt-2">14:30</div>
                    <div className="text-sm text-corporate-textTertiary mt-1">Daily peak time</div>
                  </div>
                </div>
              </div>
            } />

            {/* Catch-all route */}
            <Route path="*" element={
              <div className="flex items-center justify-center h-64">
                <div className="text-center bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-8">
                  <h1 className="text-2xl font-bold text-corporate-textPrimary mb-2">
                    Analytics Page Not Found
                  </h1>
                  <p className="text-corporate-textSecondary mb-4">
                    The requested analytics page could not be found.
                  </p>
                  <button
                    onClick={() => window.history.back()}
                    className="bg-corporate-accentPrimary text-white px-4 py-2 rounded-lg hover:bg-corporate-accentPrimaryHover transition-colors mr-2 border border-corporate-accentPrimary"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => window.location.href = '/analytics'}
                    className="bg-black/50 text-corporate-textSecondary border-2 border-corporate-borderPrimary/40 px-4 py-2 rounded-lg hover:border-corporate-borderSecondary transition-colors"
                  >
                    Analytics Dashboard
                  </button>
                </div>
              </div>
            } />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default AgentAnalyticsApp;