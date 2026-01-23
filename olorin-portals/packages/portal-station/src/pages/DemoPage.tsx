import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DemoPageTemplate, DemoStep, DemoFeature, DemoSection } from '@olorin/shared';
import { Radio, Database, RefreshCw, BarChart3, Calendar, Mic, Music, Target } from 'lucide-react';

const DemoPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const steps: DemoStep[] = [
    { title: String(t('demoPage.steps.import.title')), description: String(t('demoPage.steps.import.description')), icon: <Database className="w-6 h-6" /> },
    { title: String(t('demoPage.steps.schedule.title')), description: String(t('demoPage.steps.schedule.description')), icon: <Calendar className="w-6 h-6" /> },
    { title: String(t('demoPage.steps.broadcast.title')), description: String(t('demoPage.steps.broadcast.description')), icon: <Radio className="w-6 h-6" /> },
    { title: String(t('demoPage.steps.analyze.title')), description: String(t('demoPage.steps.analyze.description')), icon: <BarChart3 className="w-6 h-6" /> },
  ];

  const features: DemoFeature[] = [
    { title: String(t('demoPage.features.automation.title')), description: String(t('demoPage.features.automation.description')), icon: <RefreshCw className="w-6 h-6" /> },
    { title: String(t('demoPage.features.scheduling.title')), description: String(t('demoPage.features.scheduling.description')), icon: <Calendar className="w-6 h-6" /> },
    { title: String(t('demoPage.features.analytics.title')), description: String(t('demoPage.features.analytics.description')), icon: <BarChart3 className="w-6 h-6" /> },
    { title: String(t('demoPage.features.ads.title')), description: String(t('demoPage.features.ads.description')), icon: <Target className="w-6 h-6" /> },
    { title: String(t('demoPage.features.content.title')), description: String(t('demoPage.features.content.description')), icon: <Music className="w-6 h-6" /> },
    { title: String(t('demoPage.features.voice.title')), description: String(t('demoPage.features.voice.description')), icon: <Mic className="w-6 h-6" /> },
  ];

  const sections: DemoSection[] = [
    {
      title: String(t('demoPage.sections.scheduler.title')),
      description: String(t('demoPage.sections.scheduler.description')),
      features: [String(t('demoPage.sections.scheduler.f1')), String(t('demoPage.sections.scheduler.f2')), String(t('demoPage.sections.scheduler.f3')), String(t('demoPage.sections.scheduler.f4'))],
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
      heroIcon={<Radio className="w-24 h-24" />}
      scheduleDemoText={String(t('demoPage.scheduleCta'))}
      onScheduleDemo={() => navigate('/contact')}
      stepsTitle={String(t('demoPage.stepsTitle'))}
      steps={steps}
      featuresTitle={String(t('demoPage.featuresTitle'))}
      features={features}
      sections={sections}
      platformsTitle={String(t('demoPage.platformsTitle'))}
      platforms={['web', 'mobile', 'desktop']}
      ctaTitle={String(t('demoPage.ctaTitle'))}
      ctaSubtitle={String(t('demoPage.ctaSubtitle'))}
      ctaButton={String(t('demoPage.ctaButton'))}
      ctaAction={() => navigate('/contact')}
      accentColor="radio"
    />
  );
};

export default DemoPage;
