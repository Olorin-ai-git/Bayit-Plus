import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import ContactPage from './pages/ContactPage';
import KPIDemoPage from './pages/KPIDemoPage';
import NotFoundPage from './pages/NotFoundPage';
import ServerErrorPage from './pages/ServerErrorPage';
// New marketing pages
import InteractiveDemoPage from './pages/InteractiveDemoPage';
import AIAgentShowcasePage from './pages/AIAgentShowcasePage';
import ROICalculatorPage from './pages/ROICalculatorPage';
import ComparisonPage from './pages/ComparisonPage';
import UseCasesPage from './pages/UseCasesPage';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="App min-h-screen bg-corporate-bgPrimary">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/contact" element={<ContactPage />} />
              {/* Demo routes */}
              <Route path="/demo/kpi" element={<KPIDemoPage />} />
              <Route path="/demo/live" element={<InteractiveDemoPage />} />
              {/* New marketing pages */}
              <Route path="/agents" element={<AIAgentShowcasePage />} />
              <Route path="/roi" element={<ROICalculatorPage />} />
              <Route path="/compare" element={<ComparisonPage />} />
              <Route path="/use-cases" element={<UseCasesPage />} />
              <Route path="/500" element={<ServerErrorPage />} />
              {/* Catch-all route for 404 - must be last */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App; 