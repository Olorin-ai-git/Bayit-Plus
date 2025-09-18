import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { AuthProvider } from './components/AuthProvider';
import { EventBusProvider } from '../shared/services/EventBus';
import { WebSocketProvider } from '../shared/services/WebSocketService';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationSystem } from './components/NotificationSystem';
import { useAuth } from './hooks/useAuth';
import './styles/tailwind.css';

// Lazy load microservices
const AutonomousInvestigationApp = React.lazy(() =>
  import('autonomousInvestigation/App').catch(() => ({ default: () => <div>Service unavailable</div> }))
);
const ManualInvestigationApp = React.lazy(() =>
  import('manualInvestigation/App').catch(() => ({ default: () => <div>Service unavailable</div> }))
);
const AgentAnalyticsApp = React.lazy(() =>
  import('agentAnalytics/App').catch(() => ({ default: () => <div>Service unavailable</div> }))
);
const RAGIntelligenceApp = React.lazy(() =>
  import('ragIntelligence/App').catch(() => ({ default: () => <div>Service unavailable</div> }))
);
const VisualizationApp = React.lazy(() =>
  import('visualization/App').catch(() => ({ default: () => <div>Service unavailable</div> }))
);
const ReportingApp = React.lazy(() =>
  import('reporting/App').catch(() => ({ default: () => <div>Service unavailable</div> }))
);

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const Dashboard: React.FC = () => {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Olorin Investigation Platform</h1>
          <p className="mt-2 text-gray-600">AI-powered fraud detection and investigation platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Autonomous Investigations</h3>
            <p className="text-gray-600 mb-4">AI-powered automated fraud detection</p>
            <a href="/autonomous" className="text-blue-600 hover:text-blue-800 font-medium">
              Launch Service →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manual Investigations</h3>
            <p className="text-gray-600 mb-4">Expert-guided investigation tools</p>
            <a href="/manual" className="text-blue-600 hover:text-blue-800 font-medium">
              Launch Service →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Agent Analytics</h3>
            <p className="text-gray-600 mb-4">Performance metrics and insights</p>
            <a href="/analytics" className="text-blue-600 hover:text-blue-800 font-medium">
              Launch Service →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">RAG Intelligence</h3>
            <p className="text-gray-600 mb-4">Knowledge retrieval and analysis</p>
            <a href="/rag" className="text-blue-600 hover:text-blue-800 font-medium">
              Launch Service →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Visualization</h3>
            <p className="text-gray-600 mb-4">Interactive data visualization</p>
            <a href="/visualization" className="text-blue-600 hover:text-blue-800 font-medium">
              Launch Service →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reporting</h3>
            <p className="text-gray-600 mb-4">Generate comprehensive reports</p>
            <a href="/reporting" className="text-blue-600 hover:text-blue-800 font-medium">
              Launch Service →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // TODO: Implement actual login logic
      await login('demo@olorin.com', 'password');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Olorin
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                defaultValue="demo@olorin.com"
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                defaultValue="password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CoreUIApp: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <EventBusProvider>
            <WebSocketProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route
                            path="/autonomous/*"
                            element={
                              <Suspense fallback={<LoadingSpinner />}>
                                <AutonomousInvestigationApp />
                              </Suspense>
                            }
                          />
                          <Route
                            path="/manual/*"
                            element={
                              <Suspense fallback={<LoadingSpinner />}>
                                <ManualInvestigationApp />
                              </Suspense>
                            }
                          />
                          <Route
                            path="/analytics/*"
                            element={
                              <Suspense fallback={<LoadingSpinner />}>
                                <AgentAnalyticsApp />
                              </Suspense>
                            }
                          />
                          <Route
                            path="/rag/*"
                            element={
                              <Suspense fallback={<LoadingSpinner />}>
                                <RAGIntelligenceApp />
                              </Suspense>
                            }
                          />
                          <Route
                            path="/visualization/*"
                            element={
                              <Suspense fallback={<LoadingSpinner />}>
                                <VisualizationApp />
                              </Suspense>
                            }
                          />
                          <Route
                            path="/reporting/*"
                            element={
                              <Suspense fallback={<LoadingSpinner />}>
                                <ReportingApp />
                              </Suspense>
                            }
                          />
                        </Routes>
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <NotificationSystem />
            </WebSocketProvider>
          </EventBusProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default CoreUIApp;