import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@cvplus/auth';
import Layout from './components/Layout';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import AnalyticsPage from './pages/AnalyticsPage';
import CVProcessingPage from './pages/CVProcessingPage';
import MultimediaPage from './pages/MultimediaPage';
import PublicProfilesPage from './pages/PublicProfilesPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Navigation />
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/cv-processing/*" element={<CVProcessingPage />} />
              <Route path="/multimedia/*" element={<MultimediaPage />} />
              <Route path="/profiles/*" element={<PublicProfilesPage />} />
            </Routes>
          </main>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;