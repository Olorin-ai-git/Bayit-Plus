import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header, Footer } from '@olorin/shared';
import { useTranslation } from 'react-i18next';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import LanguageSelector from './components/LanguageSelector';

function App() {
  const { t } = useTranslation();

  // Navigation configuration for streaming portal
  const navigation = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.features'), href: '/features' },
    { name: t('nav.useCases'), href: '/use-cases' },
  ];

  const dropdowns = [
    {
      label: 'Solutions',
      items: [
        { name: t('nav.pricing'), href: '/pricing', description: 'View pricing plans' },
        { name: t('nav.demo'), href: '/demo', description: 'Try our live demo' },
        { name: t('nav.contact'), href: '/contact', description: 'Get in touch' },
      ]
    }
  ];

  return (
    <Router>
      <div className="App min-h-screen bg-wizard-bg-deep">
        <Header
          domain="streaming"
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
          domain="streaming"
          companyDescription="AI-powered media streaming optimization delivering exceptional viewing experiences with intelligent content delivery."
          quickLinks={[
            { name: t('nav.home'), href: '/' },
            { name: t('nav.features'), href: '/features' },
            { name: t('nav.useCases'), href: '/use-cases' },
            { name: t('nav.contact'), href: '/contact' },
          ]}
        />
      </div>
    </Router>
  );
}

export default App;
