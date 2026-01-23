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
import TransactionMonitoringPage from './pages/TransactionMonitoringPage';
import ChargebackPreventionPage from './pages/ChargebackPreventionPage';
import APIDocumentationPage from './pages/APIDocumentationPage';
import AccountTakeoverPage from './pages/AccountTakeoverPage';
import PaymentFraudPage from './pages/PaymentFraudPage';
import IdentityVerificationPage from './pages/IdentityVerificationPage';
import BotDetectionPage from './pages/BotDetectionPage';
import CompliancePage from './pages/CompliancePage';

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
        { name: t('nav.transactionMonitoring'), href: '/transaction-monitoring', description: 'Real-time transaction analysis' },
        { name: t('nav.chargebackPrevention'), href: '/chargeback-prevention', description: 'Reduce chargebacks by 80%+' },
        { name: t('nav.accountTakeover'), href: '/account-takeover', description: 'Prevent unauthorized access' },
        { name: t('nav.paymentFraud'), href: '/payment-fraud', description: 'Stop payment fraud' },
        { name: t('nav.identityVerification'), href: '/identity-verification', description: 'Verify user identities' },
        { name: t('nav.botDetection'), href: '/bot-detection', description: 'Detect and block bots' },
        { name: t('nav.compliance'), href: '/compliance', description: 'Compliance & reporting' },
        { name: t('nav.useCases'), href: '/use-cases', description: 'Industry-specific solutions' },
      ]
    },
    {
      label: 'Developers',
      items: [
        { name: t('nav.apiDocs'), href: '/api-documentation', description: 'API reference & SDKs' },
        { name: t('nav.demo'), href: '/demo', description: 'Try our live demo' },
      ]
    },
    {
      label: 'Company',
      items: [
        { name: t('nav.compare'), href: '/compare', description: 'See how we stack up' },
        { name: t('nav.roi'), href: '/roi', description: 'Calculate your savings' },
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
            <Route path="/transaction-monitoring" element={<TransactionMonitoringPage />} />
            <Route path="/chargeback-prevention" element={<ChargebackPreventionPage />} />
            <Route path="/api-documentation" element={<APIDocumentationPage />} />
            <Route path="/account-takeover" element={<AccountTakeoverPage />} />
            <Route path="/payment-fraud" element={<PaymentFraudPage />} />
            <Route path="/identity-verification" element={<IdentityVerificationPage />} />
            <Route path="/bot-detection" element={<BotDetectionPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
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
