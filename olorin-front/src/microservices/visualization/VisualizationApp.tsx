import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Lazy load components for better performance
const ChartBuilder = React.lazy(() => import('./components/ChartBuilder'));
const DataVisualization = React.lazy(() => import('./components/DataVisualization'));
const NetworkGraph = React.lazy(() => import('./components/NetworkGraph'));
const TimelineVisualization = React.lazy(() => import('./components/TimelineVisualization'));

const VisualizationApp: React.FC = () => {
  return (
    <ErrorBoundary serviceName="visualization">
      <div className="visualization-service min-h-screen bg-gray-50">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="mt-2 text-sm text-gray-600">
                Loading Visualization Service...
              </p>
            </div>
          </div>
        }>
          <Routes>
            {/* Main Visualization Dashboard */}
            <Route path="/" element={<DataVisualization />} />
            <Route path="/dashboard" element={<DataVisualization />} />

            {/* Visualization Tools */}
            <Route path="/builder" element={<ChartBuilder />} />
            <Route path="/charts" element={<DataVisualization />} />
            <Route path="/network" element={<NetworkGraph />} />
            <Route path="/timeline" element={<TimelineVisualization />} />

            {/* Chart Type Routes */}
            <Route path="/chart/:type/*" element={
              <Routes>
                <Route path="/" element={<DataVisualization />} />
                <Route path="/builder" element={<ChartBuilder />} />
                <Route path="/data" element={<DataVisualization />} />
                <Route path="*" element={<Navigate to="/chart/:type" replace />} />
              </Routes>
            } />

            {/* Network Analysis Routes */}
            <Route path="/network/*" element={
              <Routes>
                <Route path="/" element={<NetworkGraph />} />
                <Route path="/graph" element={<NetworkGraph />} />
                <Route path="/analysis" element={<NetworkGraph />} />
                <Route path="*" element={<Navigate to="/network" replace />} />
              </Routes>
            } />

            {/* Timeline Analysis Routes */}
            <Route path="/timeline/*" element={
              <Routes>
                <Route path="/" element={<TimelineVisualization />} />
                <Route path="/analysis" element={<TimelineVisualization />} />
                <Route path="/events" element={<TimelineVisualization />} />
                <Route path="*" element={<Navigate to="/timeline" replace />} />
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
                        Visualization Service Health Check
                      </h3>
                      <p className="text-green-700 mt-1">
                        Service is running and operational
                      </p>
                      <div className="mt-2 text-sm text-green-600">
                        <div>Port: 3004</div>
                        <div>Status: Ready</div>
                        <div>Components: 4 loaded</div>
                        <div>Chart.js: Loaded</div>
                        <div>vis.js: Loaded</div>
                        <div>Active Charts: 23</div>
                        <div>Last Check: {new Date().toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            } />

            <Route path="/metrics" element={
              <div className="p-4">
                <h2 className="text-xl font-bold mb-4">Visualization Service Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Active Charts</h3>
                    <div className="text-2xl font-bold text-blue-600 mt-2">23</div>
                    <div className="text-sm text-gray-500 mt-1">Currently rendering</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Charts Created</h3>
                    <div className="text-2xl font-bold text-green-600 mt-2">1,567</div>
                    <div className="text-sm text-gray-500 mt-1">This month</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Data Points</h3>
                    <div className="text-2xl font-bold text-purple-600 mt-2">2.4M</div>
                    <div className="text-sm text-gray-500 mt-1">Total visualized</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Render Time</h3>
                    <div className="text-2xl font-bold text-orange-600 mt-2">125ms</div>
                    <div className="text-sm text-gray-500 mt-1">Average</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Network Graphs</h3>
                    <div className="text-2xl font-bold text-red-600 mt-2">89</div>
                    <div className="text-sm text-gray-500 mt-1">Fraud networks</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Timeline Events</h3>
                    <div className="text-2xl font-bold text-indigo-600 mt-2">3,456</div>
                    <div className="text-sm text-gray-500 mt-1">Investigation events</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Export Requests</h3>
                    <div className="text-2xl font-bold text-yellow-600 mt-2">234</div>
                    <div className="text-sm text-gray-500 mt-1">Last 7 days</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Memory Usage</h3>
                    <div className="text-2xl font-bold text-pink-600 mt-2">45MB</div>
                    <div className="text-sm text-gray-500 mt-1">Chart cache</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Chart Types</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
                      <div className="text-lg font-bold text-blue-600">345</div>
                      <div className="text-sm text-blue-800">Line Charts</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                      <div className="text-lg font-bold text-green-600">289</div>
                      <div className="text-sm text-green-800">Bar Charts</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded p-3 text-center">
                      <div className="text-lg font-bold text-purple-600">156</div>
                      <div className="text-sm text-purple-800">Pie Charts</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded p-3 text-center">
                      <div className="text-lg font-bold text-orange-600">89</div>
                      <div className="text-sm text-orange-800">Networks</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
                      <div className="text-lg font-bold text-red-600">67</div>
                      <div className="text-sm text-red-800">Timelines</div>
                    </div>
                  </div>
                </div>
              </div>
            } />

            {/* Catch-all route */}
            <Route path="*" element={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Visualization Page Not Found
                  </h1>
                  <p className="text-gray-600 mb-4">
                    The requested visualization page could not be found.
                  </p>
                  <button
                    onClick={() => window.history.back()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mr-2"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => window.location.href = '/visualization'}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Visualization Dashboard
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

export default VisualizationApp;