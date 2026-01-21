/**
 * Financial Analysis Routes
 * Feature: 025-financial-analysis-frontend
 *
 * Route configuration for the financial analysis microservice.
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';

const FinancialDashboardPage = React.lazy(() => import('./pages/FinancialDashboardPage'));
const InvestigationFinancialPage = React.lazy(() => import('./pages/InvestigationFinancialPage'));

export const FinancialAnalysisRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<FinancialDashboardPage />} />
      <Route path="/investigation/:id" element={<InvestigationFinancialPage />} />
    </Routes>
  );
};

export default FinancialAnalysisRoutes;
