import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DemoPageTemplate, DemoStep, DemoFeature, DemoSection } from '@olorin/shared';
import { Play, BarChart3, Zap, Users, Wifi, Settings, Globe, Tv, Film } from 'lucide-react';

const DemoPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const steps: DemoStep[] = [
    { title: String(t('demoPage.steps.ingest.title')), description: String(t('demoPage.steps.ingest.description')), icon: <Film className="w-8 h-8" /> },
    { title: String(t('demoPage.steps.analyze.title')), description: String(t('demoPage.steps.analyze.description')), icon: <BarChart3 className="w-8 h-8" /> },
    { title: String(t('demoPage.steps.optimize.title')), description: String(t('demoPage.steps.optimize.description')), icon: <Settings className="w-8 h-8" /> },
    { title: String(t('demoPage.steps.deliver.title')), description: String(t('demoPage.steps.deliver.description')), icon: <Wifi className="w-8 h-8" /> },
  ];

  const features: DemoFeature[] = [
    { title: String(t('demoPage.features.adaptive.title')), description: String(t('demoPage.features.adaptive.description')), icon: <Zap className="w-6 h-6" />, badge: 'Core' },
    { title: String(t('demoPage.features.analytics.title')), description: String(t('demoPage.features.analytics.description')), icon: <BarChart3 className="w-6 h-6" /> },
    { title: String(t('demoPage.features.personalization.title')), description: String(t('demoPage.features.personalization.description')), icon: <Users className="w-6 h-6" /> },
    { title: String(t('demoPage.features.cdn.title')), description: String(t('demoPage.features.cdn.description')), icon: <Globe className="w-6 h-6" />, badge: 'New' },
    { title: String(t('demoPage.features.quality.title')), description: String(t('demoPage.features.quality.description')), icon: <Tv className="w-6 h-6" /> },
    { title: String(t('demoPage.features.realtime.title')), description: String(t('demoPage.features.realtime.description')), icon: <Play className="w-6 h-6" /> },
  ];

  const sections: DemoSection[] = [
    {
      title: String(t('demoPage.sections.player.title')),
      description: String(t('demoPage.sections.player.description')),
      features: [String(t('demoPage.sections.player.f1')), String(t('demoPage.sections.player.f2')), String(t('demoPage.sections.player.f3')), String(t('demoPage.sections.player.f4'))],
    },
    {
      title: String(t('demoPage.sections.analytics.title')),
      description: String(t('demoPage.sections.analytics.description')),
      features: [String(t('demoPage.sections.analytics.f1')), String(t('demoPage.sections.analytics.f2')), String(t('demoPage.sections.analytics.f3')), String(t('demoPage.sections.analytics.f4'))],
      reversed: true,
    },
    {
      title: String(t('demoPage.sections.content.title')),
      description: String(t('demoPage.sections.content.description')),
      features: [String(t('demoPage.sections.content.f1')), String(t('demoPage.sections.content.f2')), String(t('demoPage.sections.content.f3')), String(t('demoPage.sections.content.f4'))],
    },
  ];

  return (
    <DemoPageTemplate
      title={String(t('demoPage.title'))}
      titleHighlight={String(t('demoPage.titleHighlight'))}
      subtitle={String(t('demoPage.subtitle'))}
      heroIcon={<Play className="w-24 h-24" />}
      scheduleDemoText={String(t('demoPage.scheduleCta'))}
      onScheduleDemo={() => navigate('/contact')}
      steps={steps}
      stepsTitle={String(t('demoPage.stepsTitle'))}
      features={features}
      featuresTitle={String(t('demoPage.featuresTitle'))}
      sections={sections}
      platforms={['web', 'mobile', 'desktop']}
      platformsTitle={String(t('demoPage.platformsTitle'))}
      ctaTitle={String(t('demoPage.ctaTitle'))}
      ctaSubtitle={String(t('demoPage.ctaSubtitle'))}
      ctaButton={String(t('demoPage.ctaButton'))}
      ctaAction={() => navigate('/contact')}
      accentColor="streaming"
    />
  );
};

export default DemoPage;
