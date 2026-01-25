import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header, Footer, RTLProvider } from '@olorin/shared';
import { useTranslation } from 'react-i18next';
import './config/i18n';

const HomePage = lazy(() => import('./pages/HomePage'));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));
const UseCasesPage = lazy(() => import('./pages/UseCasesPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-wizard-bg-deep">
    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.features'), href: '/features' },
    { name: t('nav.useCases'), href: '/use-cases' },
  ];

  const dropdowns = [
    {
      label: String(t('nav.solutions')),
      items: [
        { name: t('nav.contact'), href: '/contact', description: String(t('nav.contactDescription')) },
      ]
    }
  ];

  return (
    <RTLProvider>
      <Router>
        <div className="App min-h-screen bg-wizard-bg-deep">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-wizard-accent-purple focus:text-white focus:rounded-lg"
            tabIndex={0}
          >
            {t('a11y.skipToContent')}
          </a>
          <Header
            domain="cvplus"
            navigation={navigation}
            dropdowns={dropdowns}
            showDemo={false}
            ctaText={String(t('nav.getStarted'))}
            ctaHref="/contact"
          />
          <main id="main-content" role="main" aria-label={String(t('a11y.mainContent'))}>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/use-cases" element={<UseCasesPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer
            domain="cvplus"
            companyDescription={String(t('footer.companyDescription'))}
            quickLinks={[
              { name: String(t('nav.home')), href: '/' },
              { name: String(t('nav.features')), href: '/features' },
              { name: String(t('nav.useCases')), href: '/use-cases' },
              { name: String(t('nav.contact')), href: '/contact' },
            ]}
          />
        </div>
      </Router>
    </RTLProvider>
  );
}

export default App;
