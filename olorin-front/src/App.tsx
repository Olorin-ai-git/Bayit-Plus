import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { analytics } from './firebase';

// Import modular components
import Layout from './components/Layout';
import { SandboxProvider } from './js/hooks/useSandboxContext';
import { DemoModeProvider } from './js/contexts/DemoModeContext';
import { AuthProvider } from './js/contexts/AuthContext';
import { AuthGuard } from './js/components/AuthGuard';
import { olorinTheme } from './theme/olorinTheme';
import { AppRoutes } from './routing/AppRoutes';

function App() {
  useEffect(() => {
    // Initialize Firebase Analytics
    if (analytics) {
      console.log('Firebase Analytics initialized successfully');
    }
  }, []);

  return (
    <ThemeProvider theme={olorinTheme}>
      <CssBaseline />
      <AuthProvider>
        <AuthGuard>
          <DemoModeProvider>
            <SandboxProvider>
              <Router
                future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
              >
                <Layout>
                  <AppRoutes />
                </Layout>
              </Router>
            </SandboxProvider>
          </DemoModeProvider>
        </AuthGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
