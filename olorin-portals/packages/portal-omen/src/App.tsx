import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header, Footer, LanguageSelector } from '@olorin/shared';
import { useTranslation } from 'react-i18next';
import HomePage from './pages/HomePage';
import FeaturesPage from './pages/FeaturesPage';
import TranslationPage from './pages/TranslationPage';
import PricingPage from './pages/PricingPage';
import DemoPage from './pages/DemoPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.features'), href: '/features' },
    { name: t('nav.translation'), href: '/translation' },
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
          domain="omen"
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
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/translation" element={<TranslationPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer
          domain="omen"
          companyDescription="Real-time speech translation iOS app with AI-powered transcription, instant translation, and voice synthesis for breaking language barriers."
          quickLinks={[
            { name: String(t('nav.home')), href: '/' },
            { name: String(t('nav.features')), href: '/features' },
            { name: String(t('nav.translation')), href: '/translation' },
            { name: String(t('nav.contact')), href: '/contact' },
          ]}
        />
      </div>
    </Router>
  );
}

export default App;
