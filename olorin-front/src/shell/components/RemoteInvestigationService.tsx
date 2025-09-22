import React, { Suspense } from 'react';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Dynamic import of the Manual Investigation microservice
const ManualInvestigationApp = React.lazy(() =>
  import('manualInvestigation/ManualInvestigationApp').catch(() => ({
    default: () => (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl">
              🔍
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Investigation Service</h1>
            <p className="text-xl text-gray-600 mb-8">AI-powered fraud investigation workflows and case management</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Unavailable</h3>
              <p className="text-gray-600 mb-6">The Manual Investigation service is not available. Please ensure the service is running on port 3009.</p>

              <div className="text-left bg-gray-50 rounded-xl p-4">
                <div className="font-mono text-sm text-gray-700">
                  <div className="mb-2">To start the service:</div>
                  <div className="bg-gray-800 text-green-400 px-3 py-2 rounded">
                    npm run start:manual-investigation
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }))
);

export const RemoteInvestigationService: React.FC = () => {
  return (
    <ErrorBoundary serviceName="investigation-service">
      <Suspense
        fallback={
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl">
                🔍
              </div>
              <LoadingSpinner size="lg" />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Loading Investigation Service
              </h2>
              <p className="mt-2 text-gray-600">
                Initializing AI-powered fraud detection workflows...
              </p>
            </div>
          </div>
        }
      >
        <ManualInvestigationApp />
      </Suspense>
    </ErrorBoundary>
  );
};

export default RemoteInvestigationService;