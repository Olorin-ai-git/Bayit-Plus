import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '@olorin/shared';
import { Mic } from 'lucide-react';
import { getFeatures, getWorkflowSteps, getSolutions, getMetrics } from '../config/homePageData';
import { FeaturesSection } from '../components/sections/FeaturesSection';
import { WorkflowSection } from '../components/sections/WorkflowSection';
import { MetricsSection } from '../components/sections/MetricsSection';
import { SolutionsSection } from '../components/sections/SolutionsSection';
import { CTASection } from '../components/sections/CTASection';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = getFeatures(t);
  const workflowSteps = getWorkflowSteps(t);
  const solutions = getSolutions(t);
  const metrics = getMetrics(t);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const navigateToContact = () => navigate('/contact');

  return (
    <div className="radio-homepage">
      {/* Skip Navigation Link - Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-wizard-accent-radio focus:text-white focus:rounded-lg focus:shadow-lg"
        aria-label={String(t('accessibility.skipToContent'))}
      >
        {t('accessibility.skipToContent')}
      </a>

      {/* Hero Section */}
      <HeroSection
        title={t('hero.title')}
        titleHighlight={t('hero.titleHighlight')}
        subtitle={t('hero.description')}
        primaryCTA={{
          text: t('hero.ctaExplore'),
          onClick: scrollToFeatures
        }}
        secondaryCTA={{
          text: t('hero.ctaDemo'),
          onClick: navigateToContact
        }}
        icon={<Mic className="w-32 h-32" aria-hidden="true" />}
        backgroundPattern="particles"
      />

      <FeaturesSection features={features} t={t} />
      <WorkflowSection workflowSteps={workflowSteps} t={t} />
      <MetricsSection metrics={metrics} t={t} onRequestDemo={navigateToContact} />
      <SolutionsSection solutions={solutions} t={t} />
      <CTASection t={t} onGetStarted={navigateToContact} />
    </div>
  );
};

export default HomePage;
