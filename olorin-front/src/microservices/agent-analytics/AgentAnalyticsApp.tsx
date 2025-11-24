import React, { Suspense } from 'react';
<<<<<<< HEAD
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Lazy load components for better performance
const AgentAnalyticsDashboard = React.lazy(() => import('./components/AgentAnalyticsDashboard'));
const PerformanceMetrics = React.lazy(() => import('./components/PerformanceMetrics'));
const ModelAnalytics = React.lazy(() => import('./components/ModelAnalytics'));
const UsageTracking = React.lazy(() => import('./components/UsageTracking'));
const CostAnalytics = React.lazy(() => import('./components/CostAnalytics'));
=======
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Lazy load components for better performance
const AgentAnalyticsDashboard = React.lazy(() => import('./components/AgentAnalyticsDashboard').then(module => ({ default: module.default })));
const PerformanceMetrics = React.lazy(() => import('./components/PerformanceMetrics').then(module => ({ default: module.default })));
const ModelAnalytics = React.lazy(() => import('./components/ModelAnalytics').then(module => ({ default: module.default })));
const UsageTracking = React.lazy(() => import('./components/UsageTracking').then(module => ({ default: module.default })));
const CostAnalytics = React.lazy(() => import('./components/CostAnalytics').then(module => ({ default: module.default })));
>>>>>>> 001-modify-analyzer-method

// New migrated components
const AgentDetailsViewer = React.lazy(() => import('./components/AgentDetailsViewer'));
const AgentLogMonitor = React.lazy(() => import('./components/AgentLogMonitor'));
const AgentResultsAnalyzer = React.lazy(() => import('./components/AgentResultsAnalyzer'));

const AgentAnalyticsApp: React.FC = () => {
  return (
    <ErrorBoundary serviceName="agentAnalytics">
<<<<<<< HEAD
      <div className="agent-analytics-service min-h-screen bg-gray-50">
=======
      <div className="agent-analytics-service min-h-screen bg-black">
>>>>>>> 001-modify-analyzer-method
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingSpinner size="md" />
<<<<<<< HEAD
              <p className="mt-2 text-sm text-gray-600">
=======
              <p className="mt-2 text-sm text-corporate-textSecondary">
>>>>>>> 001-modify-analyzer-method
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

<<<<<<< HEAD
            {/* Detailed Analytics Routes */}
            <Route path="/agent/:id/*" element={
              <Routes>
                <Route path="/" element={<PerformanceMetrics />} />
                <Route path="/performance" element={<PerformanceMetrics />} />
                <Route path="/usage" element={<UsageTracking />} />
                <Route path="/costs" element={<CostAnalytics />} />
                <Route path="*" element={<Navigate to="/agent/:id" replace />} />
              </Routes>
            } />

            {/* Model-specific Routes */}
            <Route path="/model/:id/*" element={
              <Routes>
                <Route path="/" element={<ModelAnalytics />} />
                <Route path="/analytics" element={<ModelAnalytics />} />
                <Route path="/performance" element={<PerformanceMetrics />} />
                <Route path="*" element={<Navigate to="/model/:id" replace />} />
              </Routes>
            } />

            {/* Health and Metrics Endpoints */}
            <Route path="/health" element={
              <div className="p-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <h3 className="text-lg font-medium text-green-800">
                        Agent Analytics Service Health Check
                      </h3>
                      <p className="text-green-700 mt-1">
                        Service is running and operational
                      </p>
                      <div className="mt-2 text-sm text-green-600">
=======
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
>>>>>>> 001-modify-analyzer-method
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
<<<<<<< HEAD
                <h2 className="text-xl font-bold mb-4">Agent Analytics Service Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Active Agents</h3>
                    <div className="text-2xl font-bold text-blue-600 mt-2">45</div>
                    <div className="text-sm text-gray-500 mt-1">+3 from yesterday</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Total Requests</h3>
                    <div className="text-2xl font-bold text-green-600 mt-2">12.4K</div>
                    <div className="text-sm text-gray-500 mt-1">Last 24 hours</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Avg Response Time</h3>
                    <div className="text-2xl font-bold text-purple-600 mt-2">285ms</div>
                    <div className="text-sm text-gray-500 mt-1">-15ms improvement</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Success Rate</h3>
                    <div className="text-2xl font-bold text-orange-600 mt-2">98.7%</div>
                    <div className="text-sm text-gray-500 mt-1">Target: 99%</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Cost This Month</h3>
                    <div className="text-2xl font-bold text-red-600 mt-2">$2,847</div>
                    <div className="text-sm text-gray-500 mt-1">Budget: $3,000</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Models in Use</h3>
                    <div className="text-2xl font-bold text-indigo-600 mt-2">12</div>
                    <div className="text-sm text-gray-500 mt-1">GPT-4, Claude, others</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Error Rate</h3>
                    <div className="text-2xl font-bold text-yellow-600 mt-2">1.3%</div>
                    <div className="text-sm text-gray-500 mt-1">Mostly rate limits</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Peak Usage</h3>
                    <div className="text-2xl font-bold text-pink-600 mt-2">14:30</div>
                    <div className="text-sm text-gray-500 mt-1">Daily peak time</div>
=======
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
>>>>>>> 001-modify-analyzer-method
                  </div>
                </div>
              </div>
            } />

            {/* Catch-all route */}
            <Route path="*" element={
              <div className="flex items-center justify-center h-64">
<<<<<<< HEAD
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Analytics Page Not Found
                  </h1>
                  <p className="text-gray-600 mb-4">
=======
                <div className="text-center bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-8">
                  <h1 className="text-2xl font-bold text-corporate-textPrimary mb-2">
                    Analytics Page Not Found
                  </h1>
                  <p className="text-corporate-textSecondary mb-4">
>>>>>>> 001-modify-analyzer-method
                    The requested analytics page could not be found.
                  </p>
                  <button
                    onClick={() => window.history.back()}
<<<<<<< HEAD
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mr-2"
=======
                    className="bg-corporate-accentPrimary text-white px-4 py-2 rounded-lg hover:bg-corporate-accentPrimaryHover transition-colors mr-2 border border-corporate-accentPrimary"
>>>>>>> 001-modify-analyzer-method
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => window.location.href = '/analytics'}
<<<<<<< HEAD
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
=======
                    className="bg-black/50 text-corporate-textSecondary border-2 border-corporate-borderPrimary/40 px-4 py-2 rounded-lg hover:border-corporate-borderSecondary transition-colors"
>>>>>>> 001-modify-analyzer-method
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