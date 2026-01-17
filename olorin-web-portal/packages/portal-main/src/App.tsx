import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header, Footer, LanguageSelector } from '@olorin/shared';
import { useTranslation } from 'react-i18next';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import KnowledgeHubPage from './pages/KnowledgeHubPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';
import SplashScreen from './components/SplashScreen';

function App() {
  const { t } = useTranslation();
  const [showSplash, setShowSplash] = useState(true);

  // Check if splash has been shown in this session
  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem('hasSeenSplash', 'true');
  };

  // Navigation configuration
  const navigation = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.about'), href: '/about' },
  ];

  const dropdowns = [
    {
      label: t('nav.solutions'),
      items: [
        {
          name: 'Fraud Detection',
          href: process.env.REACT_APP_FRAUD_URL || 'https://fraud.olorin.ai',
          description: 'AI-powered fraud prevention'
        },
        {
          name: 'Media Streaming',
          href: process.env.REACT_APP_STREAMING_URL || 'https://streaming.olorin.ai',
          description: 'Intelligent streaming solutions'
        },
        {
          name: 'Radio Management',
          href: process.env.REACT_APP_RADIO_URL || 'https://radio.olorin.ai',
          description: 'AI-driven radio operations'
        },
      ]
    },
    {
      label: 'Resources',
      items: [
        { name: t('nav.knowledgeHub'), href: '/knowledge-hub', description: 'Guides and resources' },
        { name: t('nav.contact'), href: '/contact', description: 'Get in touch' },
      ]
    }
  ];

  return (
    <>
      {/* Splash Screen - shown on first load only */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} duration={2500} />}

      {/* Main Application */}
      <Router>
        <div className="App min-h-screen bg-wizard-bg-deep">
          <Header
            domain="main"
            navigation={navigation}
            dropdowns={dropdowns}
            showDemo={false}
            ctaText={String(t('nav.getStarted'))}
            ctaHref="/contact"
            LanguageSelectorComponent={LanguageSelector}
          />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/knowledge-hub" element={<KnowledgeHubPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer
            domain="main"
            companyDescription={String(t('footer.description'))}
            quickLinks={[
              { name: String(t('nav.home')), href: '/' },
              { name: String(t('nav.about')), href: '/about' },
              { name: String(t('nav.knowledgeHub')), href: '/knowledge-hub' },
              { name: String(t('nav.contact')), href: '/contact' },
            ]}
          />
        </div>
      </Router>
    </>
  );
}

export default App;
