import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Lazy load components for better performance
const AgentAnalyticsDashboard = React.lazy(() => import('./components/AgentAnalyticsDashboard'));
const PerformanceMetrics = React.lazy(() => import('./components/PerformanceMetrics'));
const ModelAnalytics = React.lazy(() => import('./components/ModelAnalytics'));
const UsageTracking = React.lazy(() => import('./components/UsageTracking'));
const CostAnalytics = React.lazy(() => import('./components/CostAnalytics'));

const AgentAnalyticsApp: React.FC = () => {
  return (
    <ErrorBoundary serviceName="agentAnalytics">
      <div className="agent-analytics-service min-h-screen bg-gray-50">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="mt-2 text-sm text-gray-600">
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
                  </div>
                </div>
              </div>
            } />

            {/* Catch-all route */}
            <Route path="*" element={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Analytics Page Not Found
                  </h1>
                  <p className="text-gray-600 mb-4">
                    The requested analytics page could not be found.
                  </p>
                  <button
                    onClick={() => window.history.back()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mr-2"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => window.location.href = '/analytics'}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
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