import React from 'react';
import { useTranslation } from 'react-i18next';
import { FeaturesPageTemplate } from '@olorin/shared';

const FeaturesPage = () => {
  const { t } = useTranslation();

  const features = [
    {
      title: t('features.enhancement.keyword.title'),
      description: t('features.enhancement.keyword.description'),
      icon: 'search',
    },
    {
      title: t('features.enhancement.skillGap.title'),
      description: t('features.enhancement.skillGap.description'),
      icon: 'trendingUp',
    },
    {
      title: t('features.enhancement.formatting.title'),
      description: t('features.enhancement.formatting.description'),
      icon: 'edit',
    },
    {
      title: t('features.matching.personalized.title'),
      description: t('features.matching.personalized.description'),
      icon: 'target',
    },
    {
      title: t('features.matching.culture.title'),
      description: t('features.matching.culture.description'),
      icon: 'users',
    },
    {
      title: t('features.matching.salary.title'),
      description: t('features.matching.salary.description'),
      icon: 'dollarSign',
    },
  ];

  return (
    <FeaturesPageTemplate
      title="CVPlus Features"
      subtitle="AI-powered tools to accelerate your career"
      features={features}
    />
  );
};

export default FeaturesPage;
