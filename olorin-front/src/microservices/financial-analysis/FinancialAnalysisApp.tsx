/**
 * Financial Analysis App Component
 * Feature: 025-financial-analysis-frontend
 *
 * Root component for the financial analysis microservice.
 */

import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import SectionSkeleton from '@shared/components/SectionSkeleton';

const FinancialDashboardPage = React.lazy(() => import('./pages/FinancialDashboardPage'));
const InvestigationFinancialPage = React.lazy(() => import('./pages/InvestigationFinancialPage'));

const LoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <SectionSkeleton rows={6} height="lg" />
  </div>
);

const FinancialAnalysisApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<FinancialDashboardPage />} />
          <Route path="/investigation/:id" element={<InvestigationFinancialPage />} />
        </Routes>
      </Suspense>
    </div>
  );
};

export default FinancialAnalysisApp;
