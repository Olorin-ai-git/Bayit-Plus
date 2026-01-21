/**
 * PricingPage - Bayit Plus Consumer Plans
 * B2C pricing for Israeli expats: $9.99 / $14.99 / $19.99
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PricingPageTemplate, PricingTier } from '@olorin/shared';

const PricingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const s = (key: string) => String(t(key));

  const tiers: PricingTier[] = [
    {
      name: s('pricingPage.basic.name'),
      price: s('pricingPage.basic.price'),
      priceNote: s('pricingPage.basic.priceNote'),
      description: s('pricingPage.basic.description'),
      icon: 'starter',
      features: [
        { name: s('pricingPage.basic.f1'), included: true },
        { name: s('pricingPage.basic.f2'), included: true },
        { name: s('pricingPage.basic.f3'), included: true },
        { name: s('pricingPage.basic.f4'), included: true },
        { name: s('pricingPage.basic.f5'), included: true },
        { name: s('pricingPage.basic.f6'), included: true },
      ],
      ctaText: s('pricingPage.basic.cta'),
      ctaAction: () => navigate('/contact'),
    },
    {
      name: s('pricingPage.premium.name'),
      badge: s('pricingPage.premium.badge'),
      price: s('pricingPage.premium.price'),
      priceNote: s('pricingPage.premium.priceNote'),
      description: s('pricingPage.premium.description'),
      icon: 'professional',
      highlighted: true,
      features: [
        { name: s('pricingPage.premium.f1'), included: true },
        { name: s('pricingPage.premium.f2'), included: true, highlight: true },
        { name: s('pricingPage.premium.f3'), included: true },
        { name: s('pricingPage.premium.f4'), included: true, highlight: true },
        { name: s('pricingPage.premium.f5'), included: true },
        { name: s('pricingPage.premium.f6'), included: true },
      ],
      ctaText: s('pricingPage.premium.cta'),
      ctaAction: () => navigate('/contact'),
    },
    {
      name: s('pricingPage.family.name'),
      price: s('pricingPage.family.price'),
      priceNote: s('pricingPage.family.priceNote'),
      description: s('pricingPage.family.description'),
      icon: 'enterprise',
      features: [
        { name: s('pricingPage.family.f1'), included: true },
        { name: s('pricingPage.family.f2'), included: true, highlight: true },
        { name: s('pricingPage.family.f3'), included: true, highlight: true },
        { name: s('pricingPage.family.f4'), included: true },
        { name: s('pricingPage.family.f5'), included: true },
        { name: s('pricingPage.family.f6'), included: true, highlight: true },
      ],
      ctaText: s('pricingPage.family.cta'),
      ctaAction: () => navigate('/contact'),
    },
  ];

  const comparisonFeatures = [
    { name: 'VOD Library', tiers: ['500+ titles', '500+ titles', '500+ titles'] },
    { name: 'Israeli Radio', tiers: ['20+ stations', '20+ stations', '20+ stations'] },
    { name: 'Live TV Channels', tiers: [false, '15+ channels', '15+ channels'] },
    { name: 'AI Assistant', tiers: [false, true, true] },
    { name: 'Simultaneous Streams', tiers: ['1 stream', '2 streams', '4 streams'] },
    { name: 'Video Quality', tiers: ['HD (1080p)', 'Full HD (1080p)', '4K Ultra HD'] },
    { name: 'Offline Downloads', tiers: [false, false, true] },
    { name: 'User Profiles', tiers: ['1 profile', '2 profiles', '5 profiles'] },
    { name: 'Kids Mode', tiers: [false, false, true] },
  ];

  const faqs = [
    { question: s('pricingPage.faq.q1'), answer: s('pricingPage.faq.a1') },
    { question: s('pricingPage.faq.q2'), answer: s('pricingPage.faq.a2') },
    { question: s('pricingPage.faq.q3'), answer: s('pricingPage.faq.a3') },
    { question: s('pricingPage.faq.q4'), answer: s('pricingPage.faq.a4') },
    { question: s('pricingPage.faq.q5'), answer: s('pricingPage.faq.a5') },
  ];

  return (
    <PricingPageTemplate
      title={s('pricingPage.title')}
      titleHighlight={s('pricingPage.titleHighlight')}
      subtitle={s('pricingPage.subtitle')}
      tiers={tiers}
      comparisonTitle={s('pricingPage.comparisonTitle')}
      comparisonFeatures={comparisonFeatures}
      faqTitle={s('pricingPage.faqTitle')}
      faqs={faqs}
      ctaTitle={s('pricingPage.ctaTitle')}
      ctaSubtitle={s('pricingPage.ctaSubtitle')}
      ctaButton={s('pricingPage.ctaButton')}
      ctaAction={() => navigate('/contact')}
      accentColor="streaming"
    />
  );
};

export default PricingPage;
