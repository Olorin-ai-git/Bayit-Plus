import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header, Footer, LanguageSelector } from '@olorin/shared';
import { useTranslation } from 'react-i18next';
import HomePage from './pages/HomePage';
import AgentsPage from './pages/AgentsPage';
import FeaturesPage from './pages/FeaturesPage';
import UseCasesPage from './pages/UseCasesPage';
import ComparePage from './pages/ComparePage';
import ROIPage from './pages/ROIPage';
import DemoPage from './pages/DemoPage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.agents'), href: '/agents' },
    { name: t('nav.features'), href: '/features' },
  ];

  const dropdowns = [
    {
      label: 'Solutions',
      items: [
        { name: t('nav.useCases'), href: '/use-cases', description: 'Industry-specific solutions' },
        { name: t('nav.compare'), href: '/compare', description: 'See how we stack up' },
        { name: t('nav.roi'), href: '/roi', description: 'Calculate your savings' },
      ]
    },
    {
      label: 'Resources',
      items: [
        { name: t('nav.demo'), href: '/demo', description: 'Try our live demo' },
        { name: t('nav.pricing'), href: '/pricing', description: 'View pricing plans' },
        { name: t('nav.contact'), href: '/contact', description: 'Get in touch' },
      ]
    }
  ];

  return (
    <Router>
      <div className="App min-h-screen bg-wizard-bg-deep">
        <Header
          domain="fraud"
          navigation={navigation}
          dropdowns={dropdowns}
          showDemo={true}
          ctaText={String(t('nav.getStarted'))}
          ctaHref="/contact"
          LanguageSelectorComponent={LanguageSelector}
        />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/use-cases" element={<UseCasesPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/roi" element={<ROIPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer
          domain="fraud"
          companyDescription="AI-powered fraud detection and prevention with 6 specialized agents working 24/7 to protect your business."
          quickLinks={[
            { name: String(t('nav.home')), href: '/' },
            { name: String(t('nav.agents')), href: '/agents' },
            { name: String(t('nav.features')), href: '/features' },
            { name: String(t('nav.pricing')), href: '/pricing' },
            { name: String(t('nav.contact')), href: '/contact' },
          ]}
        />
      </div>
    </Router>
  );
}

export default App;
