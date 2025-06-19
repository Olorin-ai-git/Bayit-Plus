import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Import your components here
import Layout from './components/Layout';
import Home from './components/Home';
import Investigation from './components/Investigation';
import MCPPage from './js/pages/MCPPage';
import InvestigationPage from './js/pages/InvestigationPage';
import Investigations from './js/pages/Investigations';
import Settings from './js/pages/Settings';
import { SandboxProvider } from './js/hooks/useSandboxContext';

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
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SandboxProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/investigations" replace />} />
              <Route path="/investigations" element={<Investigations />} />
              <Route path="/investigation" element={<InvestigationPage />} />
              <Route path="/investigation/:id" element={<InvestigationPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/mcp" element={<MCPPage />} />
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