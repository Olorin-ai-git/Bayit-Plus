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
      name: s('pricingPage.starter.name'), price: s('pricingPage.starter.price'), priceNote: s('pricingPage.starter.priceNote'), description: s('pricingPage.starter.description'), icon: 'starter',
      features: [
        { name: s('pricingPage.starter.f1'), included: true }, { name: s('pricingPage.starter.f2'), included: true },
        { name: s('pricingPage.starter.f3'), included: true }, { name: s('pricingPage.starter.f4'), included: true },
        { name: s('pricingPage.starter.f5'), included: false }, { name: s('pricingPage.starter.f6'), included: false },
      ],
      ctaText: s('pricingPage.starter.cta'), ctaAction: () => navigate('/contact'),
    },
    {
      name: s('pricingPage.professional.name'), badge: s('pricingPage.professional.badge'), price: s('pricingPage.professional.price'), priceNote: s('pricingPage.professional.priceNote'), description: s('pricingPage.professional.description'), icon: 'professional', highlighted: true,
      features: [
        { name: s('pricingPage.professional.f1'), included: true }, { name: s('pricingPage.professional.f2'), included: true },
        { name: s('pricingPage.professional.f3'), included: true }, { name: s('pricingPage.professional.f4'), included: true },
        { name: s('pricingPage.professional.f5'), included: true, highlight: true }, { name: s('pricingPage.professional.f6'), included: false },
      ],
      ctaText: s('pricingPage.professional.cta'), ctaAction: () => navigate('/contact'),
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
    { name: 'Concurrent Viewers', tiers: ['Up to 1K', 'Up to 100K', 'Unlimited'] },
    { name: 'Video Storage', tiers: ['100 GB', '1 TB', 'Unlimited'] },
    { name: 'Analytics Dashboard', tiers: [true, true, true] },
    { name: 'Adaptive Bitrate', tiers: [true, true, true] },
    { name: 'Custom Player Branding', tiers: [false, true, true] },
    { name: 'API Access', tiers: [false, true, true] },
    { name: 'White-Label Solution', tiers: [false, false, true] },
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
      ctaAction={() => navigate('/contact')} accentColor="streaming"
    />
  );
};

export default PricingPage;
