import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header, Footer } from '@olorin/shared';
import { useTranslation } from 'react-i18next';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import LanguageSelector from './components/LanguageSelector';

function App() {
  const { t } = useTranslation();

  // Navigation configuration for fraud portal
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
          ctaText={t('nav.getStarted')}
          ctaHref="/contact"
          LanguageSelectorComponent={LanguageSelector}
        />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* Additional routes will be added here */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer
          domain="fraud"
          companyDescription="AI-powered fraud detection and prevention with 6 specialized agents working 24/7 to protect your business."
          quickLinks={[
            { name: t('nav.home'), href: '/' },
            { name: t('nav.agents'), href: '/agents' },
            { name: t('nav.features'), href: '/features' },
            { name: t('nav.contact'), href: '/contact' },
          ]}
        />
      </div>
    </Router>
  );
}

export default App;
