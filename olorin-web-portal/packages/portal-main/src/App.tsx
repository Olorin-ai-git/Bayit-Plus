import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header, Footer } from '@olorin/shared';
import { useTranslation } from 'react-i18next';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import KnowledgeHubPage from './pages/KnowledgeHubPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';
import LanguageSelector from './components/LanguageSelector';

function App() {
  const { t } = useTranslation();

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
          companyDescription={t('footer.description')}
          quickLinks={[
            { name: t('nav.home'), href: '/' },
            { name: t('nav.about'), href: '/about' },
            { name: t('nav.knowledgeHub'), href: '/knowledge-hub' },
            { name: t('nav.contact'), href: '/contact' },
          ]}
        />
      </div>
    </Router>
  );
}

export default App;
