<<<<<<< HEAD
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

=======
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { AuthProvider } from './components/AuthProvider';
import { EventBusProvider } from '@shared/events/UnifiedEventBus';
// WebSocketProvider removed per spec 005 - using polling instead
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RemoteServiceBoundary } from '@shared/components/RemoteServiceBoundary';
import { NotificationSystem } from './components/NotificationSystem';
import { useAuth } from './hooks/useAuth';
import { Button, Input } from '@shared/components/ui';
import { useDebounce } from '@shared/hooks';
import { z } from 'zod';
import './styles/tailwind.css';

// Lazy load microservices with error handling
const ReportingApp = lazy(() => 
  import('../reporting/ReportingApp').catch((error) => {
    console.warn('[CoreUI] Failed to load ReportingApp:', error);
    // Return a fallback component
    return {
      default: () => (
        <div className="p-6">
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <p className="text-yellow-400">Reporting service is unavailable</p>
          </div>
        </div>
      ),
    };
  })
);

// Fraud Detection Analytics (anomaly detection, fraud metrics)
const AnalyticsApp = lazy(async () => {
  try {
    const module = await import('../analytics/AnalyticsApp');
    if (process.env.NODE_ENV === 'development') {
      console.log('[CoreUI] Fraud Detection AnalyticsApp module loaded successfully');
    }
    return { default: module.default };
  } catch (error: any) {
    // Log error details for debugging
    console.error('[CoreUI] Failed to load Fraud Detection AnalyticsApp:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      cause: error?.cause
    });
    // Return fallback component
    return {
      default: () => (
        <div className="p-6">
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
              <p className="text-yellow-400 font-semibold mb-2">Fraud Detection Analytics service is unavailable</p>
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-2 text-xs text-yellow-300">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {error?.message || String(error)}
                  {error?.stack && `\n\nStack:\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      ),
    };
  }
});

// Agent Analytics App (AI agent performance metrics)
const AgentAnalyticsApp = lazy(async () => {
  try {
    const module = await import('../agent-analytics/AgentAnalyticsApp');
    if (process.env.NODE_ENV === 'development') {
      console.log('[CoreUI] AgentAnalyticsApp module loaded successfully');
    }
    return { default: module.default };
  } catch (error: any) {
    console.error('[CoreUI] Failed to load AgentAnalyticsApp:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      cause: error?.cause
    });
    return {
      default: () => (
        <div className="p-6">
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <p className="text-yellow-400 font-semibold mb-2">Agent Analytics service is unavailable</p>
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-2 text-xs text-yellow-300">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {error?.message || String(error)}
                  {error?.stack && `\n\nStack:\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      ),
    };
  }
});

>>>>>>> 001-modify-analyzer-method
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
<<<<<<< HEAD
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
=======
    <div className="p-6 min-h-screen bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-corporate-textPrimary">Olorin Investigation Platform</h1>
          <p className="mt-2 text-corporate-textSecondary">AI-powered fraud detection and investigation platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-black/40 backdrop-blur-md rounded-lg border-2 border-corporate-accentPrimary/40 p-6 hover:border-corporate-accentPrimary/60 transition-all duration-300 shadow-lg">
            <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">New Investigation</h3>
            <p className="text-corporate-textSecondary mb-4">AI-powered investigation workflows (Feature 004)</p>
            <a href="/investigation/settings" className="text-corporate-accentPrimary hover:text-corporate-accentSecondary font-medium">
>>>>>>> 001-modify-analyzer-method
              Launch Service →
            </a>
          </div>

<<<<<<< HEAD
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manual Investigations</h3>
            <p className="text-gray-600 mb-4">Expert-guided investigation tools</p>
            <a href="/manual" className="text-blue-600 hover:text-blue-800 font-medium">
=======
          <div className="bg-black/40 backdrop-blur-md rounded-lg border-2 border-corporate-accentPrimary/40 p-6 hover:border-corporate-accentPrimary/60 transition-all duration-300 shadow-lg">
            <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">Fraud Detection Analytics</h3>
            <p className="text-corporate-textSecondary mb-4">Anomaly detection and fraud metrics</p>
            <a href="/analytics" className="text-corporate-accentPrimary hover:text-corporate-accentSecondary font-medium">
              Launch Service →
            </a>
          </div>
          
          <div className="bg-black/40 backdrop-blur-md rounded-lg border-2 border-corporate-accentPrimary/40 p-6 hover:border-corporate-accentPrimary/60 transition-all duration-300 shadow-lg">
            <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">Agent Analytics</h3>
            <p className="text-corporate-textSecondary mb-4">AI agent performance metrics</p>
            <a href="/agent-analytics" className="text-corporate-accentPrimary hover:text-corporate-accentSecondary font-medium">
>>>>>>> 001-modify-analyzer-method
              Launch Service →
            </a>
          </div>

<<<<<<< HEAD
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Agent Analytics</h3>
            <p className="text-gray-600 mb-4">Performance metrics and insights</p>
            <a href="/analytics" className="text-blue-600 hover:text-blue-800 font-medium">
=======
          <div className="bg-black/40 backdrop-blur-md rounded-lg border-2 border-corporate-accentPrimary/40 p-6 hover:border-corporate-accentPrimary/60 transition-all duration-300 shadow-lg">
            <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">RAG Intelligence</h3>
            <p className="text-corporate-textSecondary mb-4">Knowledge retrieval and analysis</p>
            <a href="/rag" className="text-corporate-accentPrimary hover:text-corporate-accentSecondary font-medium">
>>>>>>> 001-modify-analyzer-method
              Launch Service →
            </a>
          </div>

<<<<<<< HEAD
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">RAG Intelligence</h3>
            <p className="text-gray-600 mb-4">Knowledge retrieval and analysis</p>
            <a href="/rag" className="text-blue-600 hover:text-blue-800 font-medium">
=======
          <div className="bg-black/40 backdrop-blur-md rounded-lg border-2 border-corporate-accentPrimary/40 p-6 hover:border-corporate-accentPrimary/60 transition-all duration-300 shadow-lg">
            <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">Visualization</h3>
            <p className="text-corporate-textSecondary mb-4">Interactive data visualization</p>
            <a href="/visualization" className="text-corporate-accentPrimary hover:text-corporate-accentSecondary font-medium">
>>>>>>> 001-modify-analyzer-method
              Launch Service →
            </a>
          </div>

<<<<<<< HEAD
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
=======
          <div className="bg-black/40 backdrop-blur-md rounded-lg border-2 border-corporate-accentPrimary/40 p-6 hover:border-corporate-accentPrimary/60 transition-all duration-300 shadow-lg">
            <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">Reporting</h3>
            <p className="text-corporate-textSecondary mb-4">Generate comprehensive reports</p>
            <a href="/reporting" className="text-corporate-accentPrimary hover:text-corporate-accentSecondary font-medium">
>>>>>>> 001-modify-analyzer-method
              Launch Service →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

<<<<<<< HEAD
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
=======
// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('demo@olorin.com');
  const [password, setPassword] = useState('password');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Debounce email validation to avoid excessive checks
  const debouncedEmail = useDebounce(email, 500);

  // Validate email whenever debounced value changes
  useEffect(() => {
    if (debouncedEmail) {
      const emailResult = loginSchema.shape.email.safeParse(debouncedEmail);
      if (!emailResult.success) {
        setErrors(prev => ({ ...prev, email: emailResult.error.errors[0]?.message }));
      } else {
        setErrors(prev => ({ ...prev, email: undefined }));
      }
    }
  }, [debouncedEmail]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submission
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const formattedErrors = result.error.format();
      setErrors({
        email: formattedErrors.email?._errors[0],
        password: formattedErrors.password?._errors[0]
      });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await login(email, password);
    } catch (error) {
      console.error('Login failed:', error);
      setErrors({ email: 'Invalid email or password' });
>>>>>>> 001-modify-analyzer-method
    } finally {
      setIsLoading(false);
    }
  };

  return (
<<<<<<< HEAD
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
=======
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full space-y-8 bg-black/40 backdrop-blur-md rounded-lg border-2 border-corporate-accentPrimary/40 p-8 shadow-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-corporate-textPrimary">
            Sign in to Olorin
          </h2>
          <p className="mt-2 text-center text-sm text-corporate-textSecondary">
            AI-Powered Fraud Detection Platform
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md space-y-4">
            <Input
              type="email"
              label="Email Address"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              required
              autoComplete="email"
            />
            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              required
              autoComplete="current-password"
            />
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isLoading || !!errors.email}
              loading={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>

          <div className="text-center text-xs text-corporate-textTertiary">
            <p>Demo credentials: demo@olorin.com / password</p>
>>>>>>> 001-modify-analyzer-method
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
<<<<<<< HEAD
            <WebSocketProvider>
              <Routes>
=======
            {/* WebSocketProvider removed per spec 005 - using polling instead */}
            <Routes>
>>>>>>> 001-modify-analyzer-method
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route
<<<<<<< HEAD
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
=======
                            path="/investigations/*"
                            element={
                              <div className="p-6">
                                <h2 className="text-2xl font-bold mb-4">Investigation Service</h2>
                                <p className="text-gray-600">Investigation Wizard (Feature 004) - Coming Soon</p>
                              </div>
>>>>>>> 001-modify-analyzer-method
                            }
                          />
                          <Route
                            path="/analytics/*"
                            element={
<<<<<<< HEAD
                              <Suspense fallback={<LoadingSpinner />}>
                                <AgentAnalyticsApp />
                              </Suspense>
=======
                              <ErrorBoundary>
                                <RemoteServiceBoundary serviceName="Analytics">
                                  <Suspense fallback={
                                    <div className="flex items-center justify-center h-64">
                                      <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                                        <p className="mt-2 text-sm text-gray-600">Loading Analytics Service...</p>
                                      </div>
                                    </div>
                                  }>
                                    <AnalyticsApp />
                                  </Suspense>
                                </RemoteServiceBoundary>
                              </ErrorBoundary>
                            }
                          />
                          <Route
                            path="/agent-analytics/*"
                            element={
                              <ErrorBoundary>
                                <RemoteServiceBoundary serviceName="Agent Analytics">
                                  <Suspense fallback={
                                    <div className="flex items-center justify-center h-64">
                                      <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                                        <p className="mt-2 text-sm text-gray-600">Loading Agent Analytics...</p>
                                      </div>
                                    </div>
                                  }>
                                    <AgentAnalyticsApp />
                                  </Suspense>
                                </RemoteServiceBoundary>
                              </ErrorBoundary>
>>>>>>> 001-modify-analyzer-method
                            }
                          />
                          <Route
                            path="/rag/*"
                            element={
<<<<<<< HEAD
                              <Suspense fallback={<LoadingSpinner />}>
                                <RAGIntelligenceApp />
                              </Suspense>
=======
                              <div className="p-6">
                                <h2 className="text-2xl font-bold mb-4">RAG Intelligence Service</h2>
                                <p className="text-gray-600">Service will be available via Module Federation</p>
                              </div>
>>>>>>> 001-modify-analyzer-method
                            }
                          />
                          <Route
                            path="/visualization/*"
                            element={
<<<<<<< HEAD
                              <Suspense fallback={<LoadingSpinner />}>
                                <VisualizationApp />
                              </Suspense>
=======
                              <div className="p-6">
                                <h2 className="text-2xl font-bold mb-4">Visualization Service</h2>
                                <p className="text-gray-600">Service will be available via Module Federation</p>
                              </div>
>>>>>>> 001-modify-analyzer-method
                            }
                          />
                          <Route
                            path="/reporting/*"
                            element={
<<<<<<< HEAD
                              <Suspense fallback={<LoadingSpinner />}>
                                <ReportingApp />
                              </Suspense>
=======
                              <RemoteServiceBoundary serviceName="Reporting">
                                <Suspense fallback={
                                  <div className="flex items-center justify-center h-64">
                                    <div className="text-center">
                                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                                      <p className="mt-2 text-sm text-gray-600">Loading Reporting Service...</p>
                                    </div>
                                  </div>
                                }>
                                  <ReportingApp />
                                </Suspense>
                              </RemoteServiceBoundary>
>>>>>>> 001-modify-analyzer-method
                            }
                          />
                        </Routes>
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <NotificationSystem />
<<<<<<< HEAD
            </WebSocketProvider>
=======
            {/* WebSocketProvider removed per spec 005 - using polling instead */}
>>>>>>> 001-modify-analyzer-method
          </EventBusProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default CoreUIApp;