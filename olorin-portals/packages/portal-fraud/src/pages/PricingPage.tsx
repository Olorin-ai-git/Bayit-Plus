import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PricingPageTemplate, PricingTier } from '@olorin/shared';

const PricingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tiers: PricingTier[] = [
    {
      name: t('pricingPage.poc.name'),
      badge: t('pricingPage.poc.badge'),
      price: t('pricingPage.poc.price'),
      priceNote: t('pricingPage.poc.priceNote'),
      description: t('pricingPage.poc.description'),
      icon: 'starter',
      features: [
        { name: t('pricingPage.poc.features.duration'), included: true },
        { name: t('pricingPage.poc.features.agents'), included: true },
        { name: t('pricingPage.poc.features.transactions'), included: true },
        { name: t('pricingPage.poc.features.support'), included: true },
        { name: t('pricingPage.poc.features.onboarding'), included: true },
        { name: t('pricingPage.poc.features.api'), included: false },
        { name: t('pricingPage.poc.features.sla'), included: false },
      ],
      ctaText: t('pricingPage.poc.cta'),
      ctaAction: () => navigate('/contact'),
      highlighted: true,
    },
    {
      name: t('pricingPage.professional.name'),
      price: t('pricingPage.professional.price'),
      priceNote: t('pricingPage.professional.priceNote'),
      description: t('pricingPage.professional.description'),
      icon: 'professional',
      features: [
        { name: t('pricingPage.professional.features.agents'), included: true },
        { name: t('pricingPage.professional.features.transactions'), included: true },
        { name: t('pricingPage.professional.features.support'), included: true },
        { name: t('pricingPage.professional.features.api'), included: true },
        { name: t('pricingPage.professional.features.dashboard'), included: true },
        { name: t('pricingPage.professional.features.sla'), included: true, highlight: true },
        { name: t('pricingPage.professional.features.custom'), included: false },
      ],
      ctaText: t('pricingPage.professional.cta'),
      ctaAction: () => navigate('/contact'),
    },
    {
      name: t('pricingPage.enterprise.name'),
      price: t('pricingPage.enterprise.price'),
      priceNote: t('pricingPage.enterprise.priceNote'),
      description: t('pricingPage.enterprise.description'),
      icon: 'enterprise',
      features: [
        { name: t('pricingPage.enterprise.features.agents'), included: true },
        { name: t('pricingPage.enterprise.features.transactions'), included: true },
        { name: t('pricingPage.enterprise.features.support'), included: true },
        { name: t('pricingPage.enterprise.features.api'), included: true },
        { name: t('pricingPage.enterprise.features.sla'), included: true },
        { name: t('pricingPage.enterprise.features.custom'), included: true, highlight: true },
        { name: t('pricingPage.enterprise.features.onprem'), included: true, highlight: true },
      ],
      ctaText: t('pricingPage.enterprise.cta'),
      ctaAction: () => navigate('/contact'),
    },
  ];

  const comparisonFeatures = [
    { name: 'AI Agents', tiers: ['4 Agents', '6 Agents', 'Unlimited'] },
    { name: 'Monthly Transactions', tiers: ['Up to 10K', 'Up to 1M', 'Unlimited'] },
    { name: 'Real-time Detection', tiers: [true, true, true] },
    { name: 'Custom Rules Engine', tiers: [false, true, true] },
    { name: 'API Access', tiers: [false, true, true] },
    { name: 'Dedicated Support', tiers: [false, true, true] },
    { name: 'SLA Guarantee', tiers: [false, '99.9%', '99.99%'] },
    { name: 'On-Premise Option', tiers: [false, false, true] },
  ];

  const faqs = [
    { question: t('pricingPage.faq.q1'), answer: t('pricingPage.faq.a1') },
    { question: t('pricingPage.faq.q2'), answer: t('pricingPage.faq.a2') },
    { question: t('pricingPage.faq.q3'), answer: t('pricingPage.faq.a3') },
    { question: t('pricingPage.faq.q4'), answer: t('pricingPage.faq.a4') },
  ];

  return (
    <PricingPageTemplate
      title={t('pricingPage.title')}
      titleHighlight={t('pricingPage.titleHighlight')}
      subtitle={t('pricingPage.subtitle')}
      tiers={tiers}
      comparisonTitle={t('pricingPage.comparisonTitle')}
      comparisonFeatures={comparisonFeatures}
      faqTitle={t('pricingPage.faqTitle')}
      faqs={faqs}
      ctaTitle={t('pricingPage.ctaTitle')}
      ctaSubtitle={t('pricingPage.ctaSubtitle')}
      ctaButton={t('pricingPage.ctaButton')}
      ctaAction={() => navigate('/contact')}
      accentColor="fraud"
    />
  );
};

export default PricingPage;
