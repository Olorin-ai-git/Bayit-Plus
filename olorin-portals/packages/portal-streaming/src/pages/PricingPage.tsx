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
    {
      name: s('pricingPage.comparison.vodLibrary.name'),
      tiers: [
        s('pricingPage.comparison.vodLibrary.basic'),
        s('pricingPage.comparison.vodLibrary.premium'),
        s('pricingPage.comparison.vodLibrary.family')
      ]
    },
    {
      name: s('pricingPage.comparison.israeliRadio.name'),
      tiers: [
        s('pricingPage.comparison.israeliRadio.basic'),
        s('pricingPage.comparison.israeliRadio.premium'),
        s('pricingPage.comparison.israeliRadio.family')
      ]
    },
    {
      name: s('pricingPage.comparison.liveTvChannels.name'),
      tiers: [
        false,
        s('pricingPage.comparison.liveTvChannels.premium'),
        s('pricingPage.comparison.liveTvChannels.family')
      ]
    },
    {
      name: s('pricingPage.comparison.aiAssistant.name'),
      tiers: [false, true, true]
    },
    {
      name: s('pricingPage.comparison.simultaneousStreams.name'),
      tiers: [
        s('pricingPage.comparison.simultaneousStreams.basic'),
        s('pricingPage.comparison.simultaneousStreams.premium'),
        s('pricingPage.comparison.simultaneousStreams.family')
      ]
    },
    {
      name: s('pricingPage.comparison.videoQuality.name'),
      tiers: [
        s('pricingPage.comparison.videoQuality.basic'),
        s('pricingPage.comparison.videoQuality.premium'),
        s('pricingPage.comparison.videoQuality.family')
      ]
    },
    {
      name: s('pricingPage.comparison.offlineDownloads.name'),
      tiers: [false, false, true]
    },
    {
      name: s('pricingPage.comparison.userProfiles.name'),
      tiers: [
        s('pricingPage.comparison.userProfiles.basic'),
        s('pricingPage.comparison.userProfiles.premium'),
        s('pricingPage.comparison.userProfiles.family')
      ]
    },
    {
      name: s('pricingPage.comparison.kidsMode.name'),
      tiers: [false, false, true]
    },
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
