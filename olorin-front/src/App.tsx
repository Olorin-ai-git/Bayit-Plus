import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { analytics } from './firebase';
import { preserveUrlParams } from './js/utils/urlParams';

// Import your components here
import Layout from './components/Layout';
import Home from './components/Home';
import Investigation from './components/Investigation';
import RAGPage from './js/pages/RAGPage';
import InvestigationPage from './js/pages/InvestigationPage';
import Investigations from './js/pages/Investigations';
import Settings from './js/pages/Settings';
import { SandboxProvider } from './js/hooks/useSandboxContext';

// Custom redirect component that preserves URL parameters
const ParameterPreservingRedirect: React.FC<{ to: string }> = ({ to }) => {
  const location = useLocation();
  const redirectPath = preserveUrlParams(to);
  return <Navigate to={redirectPath} replace />;
};

// Create theme with Olorin colors
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#9333ea', // primary-600
      light: '#c084fc', // primary-400
      dark: '#7c3aed', // primary-700
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#52525b', // secondary-600
      light: '#71717a', // secondary-500
      dark: '#3f3f46', // secondary-700
      contrastText: '#ffffff',
    },
    background: {
      default: '#fafafa', // secondary-50
      paper: '#ffffff',
    },
    text: {
      primary: '#18181b', // secondary-900
      secondary: '#52525b', // secondary-600
    },
  },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    body1: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    body2: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    button: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontWeight: 600,
      textTransform: 'none',
    },
    caption: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    overline: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    subtitle1: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    subtitle2: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
});

function App() {
  useEffect(() => {
    // Initialize Firebase Analytics
    if (analytics) {
      console.log('Firebase Analytics initialized successfully');
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SandboxProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Layout>
            <Routes>
              <Route path="/" element={<ParameterPreservingRedirect to="/investigations" />} />
              <Route path="/investigations" element={<Investigations />} />
              <Route path="/investigation" element={<InvestigationPage />} />
              <Route path="/investigation/:id" element={<InvestigationPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/rag" element={<RAGPage />} />
              {/* Legacy routes for backward compatibility */}
              <Route path="/home" element={<Home />} />
              <Route path="/legacy-investigation" element={<Investigation />} />
            </Routes>
          </Layout>
        </Router>
      </SandboxProvider>
    </ThemeProvider>
  );
}

export default App; 