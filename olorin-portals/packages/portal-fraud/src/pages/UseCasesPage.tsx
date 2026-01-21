import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { UseCasesPageTemplate, UseCase, IndustryStat } from '@olorin/shared';
import { Building2, ShoppingCart, FileText, Heart, Shield } from 'lucide-react';

const UseCasesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const useCases: UseCase[] = [
    {
      id: 'financial',
      title: t('useCasesPage.financial.title'),
      industry: t('useCasesPage.financial.industry'),
      icon: <Building2 className="w-8 h-8" />,
      challenge: t('useCasesPage.financial.challenge'),
      solution: t('useCasesPage.financial.solution'),
      results: [
        { metric: t('useCasesPage.financial.r1.metric'), value: t('useCasesPage.financial.r1.value') },
        { metric: t('useCasesPage.financial.r2.metric'), value: t('useCasesPage.financial.r2.value') },
        { metric: t('useCasesPage.financial.r3.metric'), value: t('useCasesPage.financial.r3.value') },
        { metric: t('useCasesPage.financial.r4.metric'), value: t('useCasesPage.financial.r4.value') },
      ],
      features: [
        t('useCasesPage.financial.f1'),
        t('useCasesPage.financial.f2'),
        t('useCasesPage.financial.f3'),
        t('useCasesPage.financial.f4'),
      ],
    },
    {
      id: 'ecommerce',
      title: t('useCasesPage.ecommerce.title'),
      industry: t('useCasesPage.ecommerce.industry'),
      icon: <ShoppingCart className="w-8 h-8" />,
      challenge: t('useCasesPage.ecommerce.challenge'),
      solution: t('useCasesPage.ecommerce.solution'),
      results: [
        { metric: t('useCasesPage.ecommerce.r1.metric'), value: t('useCasesPage.ecommerce.r1.value') },
        { metric: t('useCasesPage.ecommerce.r2.metric'), value: t('useCasesPage.ecommerce.r2.value') },
        { metric: t('useCasesPage.ecommerce.r3.metric'), value: t('useCasesPage.ecommerce.r3.value') },
        { metric: t('useCasesPage.ecommerce.r4.metric'), value: t('useCasesPage.ecommerce.r4.value') },
      ],
      features: [
        t('useCasesPage.ecommerce.f1'),
        t('useCasesPage.ecommerce.f2'),
        t('useCasesPage.ecommerce.f3'),
        t('useCasesPage.ecommerce.f4'),
      ],
    },
    {
      id: 'insurance',
      title: t('useCasesPage.insurance.title'),
      industry: t('useCasesPage.insurance.industry'),
      icon: <FileText className="w-8 h-8" />,
      challenge: t('useCasesPage.insurance.challenge'),
      solution: t('useCasesPage.insurance.solution'),
      results: [
        { metric: t('useCasesPage.insurance.r1.metric'), value: t('useCasesPage.insurance.r1.value') },
        { metric: t('useCasesPage.insurance.r2.metric'), value: t('useCasesPage.insurance.r2.value') },
        { metric: t('useCasesPage.insurance.r3.metric'), value: t('useCasesPage.insurance.r3.value') },
        { metric: t('useCasesPage.insurance.r4.metric'), value: t('useCasesPage.insurance.r4.value') },
      ],
      features: [
        t('useCasesPage.insurance.f1'),
        t('useCasesPage.insurance.f2'),
        t('useCasesPage.insurance.f3'),
        t('useCasesPage.insurance.f4'),
      ],
    },
    {
      id: 'healthcare',
      title: t('useCasesPage.healthcare.title'),
      industry: t('useCasesPage.healthcare.industry'),
      icon: <Heart className="w-8 h-8" />,
      challenge: t('useCasesPage.healthcare.challenge'),
      solution: t('useCasesPage.healthcare.solution'),
      results: [
        { metric: t('useCasesPage.healthcare.r1.metric'), value: t('useCasesPage.healthcare.r1.value') },
        { metric: t('useCasesPage.healthcare.r2.metric'), value: t('useCasesPage.healthcare.r2.value') },
        { metric: t('useCasesPage.healthcare.r3.metric'), value: t('useCasesPage.healthcare.r3.value') },
        { metric: t('useCasesPage.healthcare.r4.metric'), value: t('useCasesPage.healthcare.r4.value') },
      ],
      features: [
        t('useCasesPage.healthcare.f1'),
        t('useCasesPage.healthcare.f2'),
        t('useCasesPage.healthcare.f3'),
        t('useCasesPage.healthcare.f4'),
      ],
    },
  ];

  const industryStats: IndustryStat[] = [
    { value: '$50B+', label: t('useCasesPage.stats.fraudLosses') },
    { value: '6', label: t('useCasesPage.stats.aiAgents') },
    { value: '<1s', label: t('useCasesPage.stats.responseTime') },
    { value: '24/7', label: t('useCasesPage.stats.monitoring') },
  ];

  return (
    <UseCasesPageTemplate
      title={t('useCasesPage.title')}
      titleHighlight={t('useCasesPage.titleHighlight')}
      subtitle={t('useCasesPage.subtitle')}
      heroIcon={<Shield className="w-24 h-24" />}
      useCases={useCases}
      industryStats={industryStats}
      statsTitle={t('useCasesPage.statsTitle')}
      ctaTitle={t('useCasesPage.ctaTitle')}
      ctaSubtitle={t('useCasesPage.ctaSubtitle')}
      ctaButton={t('useCasesPage.ctaButton')}
      ctaAction={() => navigate('/contact')}
      accentColor="fraud"
    />
  );
};

export default UseCasesPage;
