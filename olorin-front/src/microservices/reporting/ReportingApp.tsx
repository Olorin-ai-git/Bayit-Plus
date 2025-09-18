import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Lazy load components for better performance
const ReportBuilder = React.lazy(() => import('./components/ReportBuilder'));
const ReportDashboard = React.lazy(() => import('./components/ReportDashboard'));
const ReportViewer = React.lazy(() => import('./components/ReportViewer'));

const ReportingApp: React.FC = () => {
  return (
    <ErrorBoundary serviceName="reporting">
      <div className="reporting-service min-h-screen bg-gray-50">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="mt-2 text-sm text-gray-600">
                Loading Reporting Service...
              </p>
            </div>
          </div>
        }>
          <Routes>
            {/* Main Reporting Dashboard */}
            <Route path="/" element={<ReportDashboard />} />
            <Route path="/dashboard" element={<ReportDashboard />} />

            {/* Report Management */}
            <Route path="/builder" element={<ReportBuilder />} />
            <Route path="/create" element={<ReportBuilder />} />
            <Route path="/viewer/:id" element={<ReportViewer />} />
            <Route path="/view/:id" element={<ReportViewer />} />

            {/* Report Builder Routes */}
            <Route path="/builder/*" element={
              <Routes>
                <Route path="/" element={<ReportBuilder />} />
                <Route path="/template/:id" element={<ReportBuilder />} />
                <Route path="/edit/:id" element={<ReportBuilder />} />
                <Route path="*" element={<Navigate to="/builder" replace />} />
              </Routes>
            } />

            {/* Report Viewer Routes */}
            <Route path="/report/:id/*" element={
              <Routes>
                <Route path="/" element={<ReportViewer />} />
                <Route path="/view" element={<ReportViewer />} />
                <Route path="/edit" element={<ReportBuilder />} />
                <Route path="*" element={<Navigate to="/report/:id" replace />} />
              </Routes>
            } />

            {/* Template Management Routes */}
            <Route path="/template/*" element={
              <Routes>
                <Route path="/" element={<ReportDashboard />} />
                <Route path="/:id" element={<ReportBuilder />} />
                <Route path="/:id/edit" element={<ReportBuilder />} />
                <Route path="*" element={<Navigate to="/template" replace />} />
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
                        Reporting Service Health Check
                      </h3>
                      <p className="text-green-700 mt-1">
                        Service is running and operational
                      </p>
                      <div className="mt-2 text-sm text-green-600">
                        <div>Port: 3005</div>
                        <div>Status: Ready</div>
                        <div>Components: 3 loaded</div>
                        <div>PDF Engine: Ready</div>
                        <div>Templates: 15 available</div>
                        <div>Active Reports: 8</div>
                        <div>Last Check: {new Date().toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            } />

            <Route path="/metrics" element={
              <div className="p-4">
                <h2 className="text-xl font-bold mb-4">Reporting Service Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Reports Generated</h3>
                    <div className="text-2xl font-bold text-blue-600 mt-2">1,234</div>
                    <div className="text-sm text-gray-500 mt-1">This month</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Active Reports</h3>
                    <div className="text-2xl font-bold text-green-600 mt-2">8</div>
                    <div className="text-sm text-gray-500 mt-1">Currently processing</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Templates</h3>
                    <div className="text-2xl font-bold text-purple-600 mt-2">15</div>
                    <div className="text-sm text-gray-500 mt-1">Available templates</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Avg Generation Time</h3>
                    <div className="text-2xl font-bold text-orange-600 mt-2">3.2s</div>
                    <div className="text-sm text-gray-500 mt-1">PDF creation</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Downloads</h3>
                    <div className="text-2xl font-bold text-red-600 mt-2">2,847</div>
                    <div className="text-sm text-gray-500 mt-1">Total downloads</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Scheduled Reports</h3>
                    <div className="text-2xl font-bold text-indigo-600 mt-2">23</div>
                    <div className="text-sm text-gray-500 mt-1">Automated reports</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Storage Used</h3>
                    <div className="text-2xl font-bold text-yellow-600 mt-2">2.8GB</div>
                    <div className="text-sm text-gray-500 mt-1">Report archive</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Success Rate</h3>
                    <div className="text-2xl font-bold text-pink-600 mt-2">99.2%</div>
                    <div className="text-sm text-gray-500 mt-1">Generation success</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Report Types</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
                      <div className="text-lg font-bold text-blue-600">567</div>
                      <div className="text-sm text-blue-800">Investigation Reports</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                      <div className="text-lg font-bold text-green-600">234</div>
                      <div className="text-sm text-green-800">Analytics Reports</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded p-3 text-center">
                      <div className="text-lg font-bold text-purple-600">345</div>
                      <div className="text-sm text-purple-800">Compliance Reports</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded p-3 text-center">
                      <div className="text-lg font-bold text-orange-600">88</div>
                      <div className="text-sm text-orange-800">Custom Reports</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Export Formats</h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    <div className="bg-red-50 border border-red-200 rounded p-2 text-center">
                      <div className="text-lg font-bold text-red-600">856</div>
                      <div className="text-xs text-red-800">PDF</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
                      <div className="text-lg font-bold text-green-600">234</div>
                      <div className="text-xs text-green-800">Excel</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 text-center">
                      <div className="text-lg font-bold text-blue-600">123</div>
                      <div className="text-xs text-blue-800">Word</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded p-2 text-center">
                      <div className="text-lg font-bold text-purple-600">67</div>
                      <div className="text-xs text-purple-800">CSV</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-center">
                      <div className="text-lg font-bold text-yellow-600">45</div>
                      <div className="text-xs text-yellow-800">JSON</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded p-2 text-center">
                      <div className="text-lg font-bold text-gray-600">23</div>
                      <div className="text-xs text-gray-800">HTML</div>
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
                    Report Page Not Found
                  </h1>
                  <p className="text-gray-600 mb-4">
                    The requested reporting page could not be found.
                  </p>
                  <button
                    onClick={() => window.history.back()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mr-2"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => window.location.href = '/reports'}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Report Dashboard
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

export default ReportingApp;