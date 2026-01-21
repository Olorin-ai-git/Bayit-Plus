import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useB2BAuthStore } from './stores/authStore';
import { PartnerLayout } from './components/layout/PartnerLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { ToastContainer } from './components/common/ToastContainer';
import { useDirection } from './hooks/useDirection';

const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const UsagePage = React.lazy(() => import('./pages/UsagePage'));
const BillingPage = React.lazy(() => import('./pages/BillingPage'));
const ApiKeysPage = React.lazy(() => import('./pages/ApiKeysPage'));
const TeamPage = React.lazy(() => import('./pages/TeamPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const PlaygroundPage = React.lazy(() => import('./pages/PlaygroundPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useB2BAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useB2BAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { isRTL } = useDirection();

  React.useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = isRTL ? 'he' : 'en';
  }, [isRTL]);

  return (
    <>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <Routes>
          {/* Public Routes - LoginPage and RegisterPage include AuthLayout */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <PartnerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="usage" element={<UsagePage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="playground" element={<PlaygroundPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ToastContainer />
    </>
  );
}
