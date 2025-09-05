import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import components
import Home from '../components/Home';
import Investigation from '../components/Investigation';
import RAGPage from '../js/pages/RAGPage';
import InvestigationPage from '../js/pages/InvestigationPage';
import Investigations from '../js/pages/Investigations';
import Settings from '../js/pages/Settings';
import MultiEntityInvestigationPanel from '../js/components/MultiEntityInvestigationPanel';
import ProtectedRoute from '../components/ProtectedRoute';
import RootRedirect from '../components/RootRedirect';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={<RootRedirect />}
      />
      <Route 
        path="/investigations" 
        element={<ProtectedRoute element={<Investigations />} allowedInDemo={false} />} 
      />
      <Route 
        path="/investigation" 
        element={<ProtectedRoute element={<InvestigationPage />} allowedInDemo={true} />} 
      />
      <Route
        path="/investigation/:id"
        element={<ProtectedRoute element={<InvestigationPage />} allowedInDemo={true} />}
      />
      <Route 
        path="/multi-entity-investigation" 
        element={<ProtectedRoute element={<MultiEntityInvestigationPanel />} allowedInDemo={true} />} 
      />
      <Route 
        path="/settings" 
        element={<ProtectedRoute element={<Settings />} allowedInDemo={false} />} 
      />
      <Route 
        path="/rag" 
        element={<ProtectedRoute element={<RAGPage />} allowedInDemo={true} />} 
      />
      {/* Legacy routes for backward compatibility */}
      <Route 
        path="/home" 
        element={<ProtectedRoute element={<Home />} allowedInDemo={false} />} 
      />
      <Route 
        path="/legacy-investigation" 
        element={<ProtectedRoute element={<Investigation />} allowedInDemo={false} />} 
      />
    </Routes>
  );
};
