import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header, Footer } from '@olorin/shared';
import { useTranslation } from 'react-i18next';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import LanguageSelector from './components/LanguageSelector';

function App() {
  const { t } = useTranslation();

  // Navigation configuration for radio portal
  const navigation = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.features'), href: '/features' },
    { name: t('nav.solutions'), href: '/solutions' },
  ];

  const dropdowns = [
    {
      label: 'Resources',
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
          domain="radio"
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
            {/* Additional routes will be added here */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer
          domain="radio"
          companyDescription="AI-powered radio management automating scheduling, analytics, and programming for broadcasters worldwide."
          quickLinks={[
            { name: String(t('nav.home')), href: '/' },
            { name: String(t('nav.features')), href: '/features' },
            { name: String(t('nav.solutions')), href: '/solutions' },
            { name: String(t('nav.contact')), href: '/contact' },
          ]}
        />
      </div>
    </Router>
  );
}

export default App;
