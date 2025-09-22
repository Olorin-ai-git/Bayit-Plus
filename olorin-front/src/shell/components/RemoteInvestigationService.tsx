import React, { Suspense } from 'react';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';

// Temporary direct import due to Module Federation issues
// TODO: Restore Module Federation once webpack runtime issue is resolved
const ManualInvestigationApp = React.lazy(() =>
  import('../../microservices/manual-investigation/ManualInvestigationApp')
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