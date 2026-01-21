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
      name: s('pricingPage.free.name'), price: s('pricingPage.free.price'), priceNote: s('pricingPage.free.priceNote'), description: s('pricingPage.free.description'), icon: 'starter',
      features: [
        { name: s('pricingPage.free.f1'), included: true }, { name: s('pricingPage.free.f2'), included: true },
        { name: s('pricingPage.free.f3'), included: true }, { name: s('pricingPage.free.f4'), included: false },
        { name: s('pricingPage.free.f5'), included: false }, { name: s('pricingPage.free.f6'), included: false },
      ],
      ctaText: s('pricingPage.free.cta'), ctaAction: () => navigate('/contact'),
    },
    {
      name: s('pricingPage.premium.name'), badge: s('pricingPage.premium.badge'), price: s('pricingPage.premium.price'), priceNote: s('pricingPage.premium.priceNote'), description: s('pricingPage.premium.description'), icon: 'professional', highlighted: true,
      features: [
        { name: s('pricingPage.premium.f1'), included: true }, { name: s('pricingPage.premium.f2'), included: true },
        { name: s('pricingPage.premium.f3'), included: true }, { name: s('pricingPage.premium.f4'), included: true, highlight: true },
        { name: s('pricingPage.premium.f5'), included: true }, { name: s('pricingPage.premium.f6'), included: false },
      ],
      ctaText: s('pricingPage.premium.cta'), ctaAction: () => navigate('/contact'),
    },
    {
      name: s('pricingPage.enterprise.name'), price: s('pricingPage.enterprise.price'), priceNote: s('pricingPage.enterprise.priceNote'), description: s('pricingPage.enterprise.description'), icon: 'enterprise',
      features: [
        { name: s('pricingPage.enterprise.f1'), included: true }, { name: s('pricingPage.enterprise.f2'), included: true },
        { name: s('pricingPage.enterprise.f3'), included: true }, { name: s('pricingPage.enterprise.f4'), included: true },
        { name: s('pricingPage.enterprise.f5'), included: true }, { name: s('pricingPage.enterprise.f6'), included: true, highlight: true },
      ],
      ctaText: s('pricingPage.enterprise.cta'), ctaAction: () => navigate('/contact'),
    },
  ];

  const comparisonFeatures = [
    { name: 'Translation Minutes', tiers: ['30/month', 'Unlimited', 'Unlimited'] },
    { name: 'Languages', tiers: ['2', '5', '5+'] },
    { name: 'AI Voice Synthesis', tiers: [true, true, true] },
    { name: 'Wearable Support', tiers: [false, true, true] },
    { name: 'Priority Processing', tiers: [false, true, true] },
    { name: 'Custom Voice Profiles', tiers: [false, false, true] },
    { name: 'API Access', tiers: [false, false, true] },
    { name: 'Dedicated Support', tiers: [false, true, true] },
  ];

  const faqs = [
    { question: s('pricingPage.faq.q1'), answer: s('pricingPage.faq.a1') },
    { question: s('pricingPage.faq.q2'), answer: s('pricingPage.faq.a2') },
    { question: s('pricingPage.faq.q3'), answer: s('pricingPage.faq.a3') },
  ];

  return (
    <PricingPageTemplate
      title={s('pricingPage.title')} titleHighlight={s('pricingPage.titleHighlight')} subtitle={s('pricingPage.subtitle')}
      tiers={tiers} comparisonTitle={s('pricingPage.comparisonTitle')} comparisonFeatures={comparisonFeatures}
      faqTitle={s('pricingPage.faqTitle')} faqs={faqs}
      ctaTitle={s('pricingPage.ctaTitle')} ctaSubtitle={s('pricingPage.ctaSubtitle')} ctaButton={s('pricingPage.ctaButton')}
      ctaAction={() => navigate('/contact')} accentColor="omen"
    />
  );
};

export default PricingPage;
