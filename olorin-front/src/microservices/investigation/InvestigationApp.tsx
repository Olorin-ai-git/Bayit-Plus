import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
<<<<<<< HEAD
import ErrorBoundary from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { InvestigationProvider } from './contexts/InvestigationContext';

// Lazy load components for better performance
const InvestigationDashboard = React.lazy(() => import('./components/InvestigationDashboard'));
const AutonomousInvestigation = React.lazy(() => import('./components/AutonomousInvestigation'));
const ManualInvestigationDetails = React.lazy(() => import('./components/ManualInvestigationDetails'));
const InvestigationWizard = React.lazy(() => import('./components/InvestigationWizard'));
const EvidenceManager = React.lazy(() => import('./components/EvidenceManager'));
const InvestigationStepTracker = React.lazy(() => import('./components/InvestigationStepTracker'));
const CollaborationPanel = React.lazy(() => import('./components/CollaborationPanel'));
=======
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Lazy load components for better performance
const InvestigationsManagementPage = React.lazy(() =>
  import('../investigations-management/pages/InvestigationsManagementPage').then(module => ({ default: module.InvestigationsManagementPage }))
);
const StructuredInvestigation = React.lazy(() => import('./components/AutonomousInvestigation'));
const ManualInvestigationDetails = React.lazy(() => import('./components/ManualInvestigationDetails'));
const InvestigationWizard = React.lazy(() => import('./containers/InvestigationWizard'));
const EvidenceManager = React.lazy(() => import('./components/EvidenceManager'));
const InvestigationStepTracker = React.lazy(() => import('./components/InvestigationStepTracker'));
const CollaborationPanel = React.lazy(() => import('./components/CollaborationPanel'));
const KPIDashboard = React.lazy(() => import('./components/KPIDashboard'));
const ComparisonPage = React.lazy(() => import('./pages/ComparisonPage'));
>>>>>>> 001-modify-analyzer-method

const InvestigationApp: React.FC = () => {
  return (
    <ErrorBoundary serviceName="investigation">
<<<<<<< HEAD
      <InvestigationProvider autoRefresh={true} refreshInterval={30000}>
        <div className="investigation-service min-h-screen bg-gray-50">
=======
      <div className="investigation-service min-h-screen bg-black">
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
                Loading Investigation Service...
              </p>
            </div>
          </div>
        }>
          <Routes>
<<<<<<< HEAD
            {/* Main Dashboard */}
            <Route path="/" element={<InvestigationDashboard />} />
            <Route path="/dashboard" element={<InvestigationDashboard />} />

            {/* Investigation Types */}
            <Route path="/autonomous" element={<AutonomousInvestigation />} />
            <Route path="/manual/:id" element={<ManualInvestigationDetails />} />
            <Route path="/wizard" element={<InvestigationWizard />} />

            {/* Investigation Management */}
            <Route path="/evidence" element={<EvidenceManager />} />
            <Route path="/tracker" element={<InvestigationStepTracker />} />
            <Route path="/collaboration" element={<CollaborationPanel />} />
=======
            {/* Comparison Page - Investigation Comparison */}
            <Route path="comparison" element={
              <Suspense fallback={
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <LoadingSpinner size="md" />
                    <p className="mt-2 text-sm text-corporate-textSecondary">
                      Loading Comparison Page...
                    </p>
                  </div>
                </div>
              }>
                <ComparisonPage />
              </Suspense>
            } />
            
            {/* Main Dashboard - Investigations Management */}
            <Route path="/" element={<InvestigationsManagementPage />} />
            <Route path="dashboard" element={<InvestigationsManagementPage />} />

            {/* Investigation Types */}
            <Route path="structured" element={<StructuredInvestigation />} />
            <Route path="manual/:id" element={<ManualInvestigationDetails />} />

            {/* Investigation Wizard - All Steps */}
            <Route path="wizard" element={<InvestigationWizard />} />
            <Route path="settings" element={<InvestigationWizard />} />
            <Route path="progress" element={<InvestigationWizard />} />
            <Route path="results" element={<InvestigationWizard />} />

            {/* Investigation Management */}
            <Route path="evidence" element={<EvidenceManager />} />
            <Route path="tracker" element={<InvestigationStepTracker />} />
            <Route path="collaboration" element={<CollaborationPanel />} />

            {/* KPI Dashboard - POC Overview */}
            <Route path="poc/:pilotId/overview" element={<KPIDashboard />} />
>>>>>>> 001-modify-analyzer-method

            {/* Nested Routes for Investigation Details */}
            <Route path="/investigation/:id/*" element={
              <Routes>
                <Route path="/" element={<ManualInvestigationDetails />} />
                <Route path="/evidence" element={<EvidenceManager />} />
                <Route path="/tracker" element={<InvestigationStepTracker />} />
                <Route path="/collaboration" element={<CollaborationPanel />} />
                <Route path="*" element={<Navigate to="/investigation/:id" replace />} />
              </Routes>
            } />

            {/* Default and Fallback Routes */}
            <Route path="/health" element={
              <div className="p-4">
<<<<<<< HEAD
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <h3 className="text-lg font-medium text-green-800">
                        Investigation Service Health Check
                      </h3>
                      <p className="text-green-700 mt-1">
                        Service is running and operational
                      </p>
                      <div className="mt-2 text-sm text-green-600">
=======
                <div className="bg-black/40 backdrop-blur border border-corporate-success rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-corporate-success rounded-full mr-3"></div>
                    <div>
                      <h3 className="text-lg font-medium text-corporate-textPrimary">
                        Investigation Service Health Check
                      </h3>
                      <p className="text-corporate-textSecondary mt-1">
                        Service is running and operational
                      </p>
                      <div className="mt-2 text-sm text-corporate-textTertiary">
>>>>>>> 001-modify-analyzer-method
                        <div>Port: 3001</div>
                        <div>Status: Ready</div>
                        <div>Components: 7 loaded</div>
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
                <h2 className="text-xl font-bold mb-4">Investigation Service Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Active Investigations</h3>
                    <div className="text-2xl font-bold text-blue-600 mt-2">24</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Completed Today</h3>
                    <div className="text-2xl font-bold text-green-600 mt-2">8</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Evidence Items</h3>
                    <div className="text-2xl font-bold text-purple-600 mt-2">156</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-medium text-gray-900">Response Time</h3>
                    <div className="text-2xl font-bold text-orange-600 mt-2">1.2s</div>
=======
                <h2 className="text-xl font-bold text-corporate-textPrimary mb-4">Investigation Service Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-black/40 backdrop-blur border-2 border-corporate-info rounded-lg p-4 hover:border-corporate-accentSecondary transition-all duration-300">
                    <h3 className="font-medium text-corporate-textPrimary">Active Investigations</h3>
                    <div className="text-2xl font-bold text-corporate-info mt-2">24</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur border-2 border-corporate-success rounded-lg p-4 hover:border-corporate-accentSecondary transition-all duration-300">
                    <h3 className="font-medium text-corporate-textPrimary">Completed Today</h3>
                    <div className="text-2xl font-bold text-corporate-success mt-2">8</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur border-2 border-corporate-accentSecondary rounded-lg p-4 hover:border-corporate-accentSecondary transition-all duration-300">
                    <h3 className="font-medium text-corporate-textPrimary">Evidence Items</h3>
                    <div className="text-2xl font-bold text-corporate-accentSecondary mt-2">156</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur border-2 border-corporate-warning rounded-lg p-4 hover:border-corporate-accentSecondary transition-all duration-300">
                    <h3 className="font-medium text-corporate-textPrimary">Response Time</h3>
                    <div className="text-2xl font-bold text-corporate-warning mt-2">1.2s</div>
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
                    Investigation Page Not Found
                  </h1>
                  <p className="text-gray-600 mb-4">
=======
                <div className="text-center bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-8">
                  <h1 className="text-2xl font-bold text-corporate-textPrimary mb-2">
                    Investigation Page Not Found
                  </h1>
                  <p className="text-corporate-textSecondary mb-4">
>>>>>>> 001-modify-analyzer-method
                    The requested investigation page could not be found.
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
                    onClick={() => window.location.href = '/investigations'}
<<<<<<< HEAD
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
=======
                    className="bg-black/50 text-corporate-textSecondary border-2 border-corporate-borderPrimary/40 px-4 py-2 rounded-lg hover:border-corporate-borderSecondary transition-colors"
>>>>>>> 001-modify-analyzer-method
                  >
                    Investigation Dashboard
                  </button>
                </div>
              </div>
            } />
          </Routes>
        </Suspense>
<<<<<<< HEAD
        </div>
      </InvestigationProvider>
=======
      </div>
>>>>>>> 001-modify-analyzer-method
    </ErrorBoundary>
  );
};

export default InvestigationApp;