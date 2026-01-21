import React from 'react';
import { Routes, Route } from 'react-router-dom';

// All components have been migrated to microservices
// Legacy imports removed - functionality now available via Shell app

// Migration Notice Component
const MigrationNotice: React.FC<{ title: string; service: string }> = ({ title, service }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600 mb-4">
        This functionality has been migrated to the {service} microservice.
      </p>
      <p className="text-gray-600 mb-6">
        Please use the new Shell application at <strong>port 3000</strong> to access this feature.
      </p>
      <button
        onClick={() => window.location.href = 'http://localhost:3000'}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
      >
        Go to Shell App
      </button>
    </div>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root redirect to Shell app */}
      <Route
        path="/"
        element={<MigrationNotice title="Welcome to Olorin" service="Shell" />}
      />

      {/* All legacy routes now show migration notices */}
      <Route
        path="/investigations"
        element={<MigrationNotice title="Investigations" service="Investigation" />}
      />
      <Route
        path="/investigation"
        element={<MigrationNotice title="Investigation" service="Investigation" />}
      />
      <Route
        path="/investigation/:id"
        element={<MigrationNotice title="Investigation Details" service="Investigation" />}
      />
      <Route
        path="/multi-entity-investigation"
        element={<MigrationNotice title="Multi-Entity Investigation" service="Investigation" />}
      />
      <Route
        path="/settings"
        element={<MigrationNotice title="Settings" service="Core UI" />}
      />
      <Route
        path="/rag"
        element={<MigrationNotice title="RAG Intelligence" service="RAG Intelligence" />}
      />
      <Route
        path="/home"
        element={<MigrationNotice title="Home" service="Shell" />}
      />
      <Route
        path="/legacy-investigation"
        element={<MigrationNotice title="Investigation" service="Investigation" />}
      />

      {/* Catch-all route */}
      <Route
        path="*"
        element={<MigrationNotice title="Page Not Found" service="Shell" />}
      />
    </Routes>
  );
};
