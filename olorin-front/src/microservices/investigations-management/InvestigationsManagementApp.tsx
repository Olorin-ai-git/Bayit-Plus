/**
 * Investigations Management App
 * Main application component for the Investigations Management microservice
 */

import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { ToastProvider } from '@shared/components/ui/ToastProvider';
import { InvestigationsManagementPage } from './pages/InvestigationsManagementPage';
import './styles/tailwind.css';

const InvestigationsManagementApp: React.FC = () => {
  return (
    <ErrorBoundary serviceName="investigations-management">
      <ToastProvider>
        <div className="investigations-management min-h-screen bg-black">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <LoadingSpinner size="md" />
                <p className="mt-2 text-sm text-corporate-textSecondary">
                  Loading Investigations Management...
                </p>
              </div>
            </div>
          }>
            <Routes>
              <Route index element={<InvestigationsManagementPage />} />
              <Route path="*" element={<InvestigationsManagementPage />} />
            </Routes>
          </Suspense>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default InvestigationsManagementApp;

