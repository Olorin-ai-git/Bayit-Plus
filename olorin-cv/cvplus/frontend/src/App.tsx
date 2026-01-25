import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { AuthProvider } from '@/context/AuthProvider';
import { ConfigProvider } from '@/context/ConfigProvider';
import { PrivateLayout } from '@/components/layouts/PrivateLayout';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import i18n from './i18n/config';
import { initWebI18n, setupWebDirectionListener } from '@olorin/shared-i18n/web';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Lazy load pages for code splitting
const UploadPage = lazy(() => import('@/pages/UploadPage').then(m => ({ default: m.UploadPage })));
const EnhancePage = lazy(() => import('@/pages/EnhancePage').then(m => ({ default: m.EnhancePage })));
const SharePage = lazy(() => import('@/pages/SharePage').then(m => ({ default: m.SharePage })));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white" />
    </div>
  );
}

function App() {
  useEffect(() => {
    initWebI18n();
    setupWebDirectionListener();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  {/* Public routes */}
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<Navigate to="/upload" replace />} />
                  </Route>

                  {/* Private routes */}
                  <Route element={<PrivateLayout />}>
                    <Route path="/upload" element={<UploadPage />} />
                    <Route path="/enhance/:jobId" element={<EnhancePage />} />
                    <Route path="/share/:jobId" element={<SharePage />} />
                  </Route>

                  {/* 404 */}
                  <Route path="*" element={<Navigate to="/upload" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

export default App;
