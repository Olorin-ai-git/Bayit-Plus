import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DemoPageTemplate, DemoStep, DemoFeature, DemoSection } from '@olorin/shared';
import { Shield, Database, RefreshCw, AlertTriangle, Gauge, MapPin, Network, User, Fingerprint, Zap, Bell } from 'lucide-react';

const DemoPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const steps: DemoStep[] = [
    { title: t('demoPage.steps.ingest.title'), description: t('demoPage.steps.ingest.description'), icon: <Database className="w-8 h-8" /> },
    { title: t('demoPage.steps.analyze.title'), description: t('demoPage.steps.analyze.description'), icon: <RefreshCw className="w-8 h-8" /> },
    { title: t('demoPage.steps.detect.title'), description: t('demoPage.steps.detect.description'), icon: <AlertTriangle className="w-8 h-8" /> },
    { title: t('demoPage.steps.score.title'), description: t('demoPage.steps.score.description'), icon: <Gauge className="w-8 h-8" /> },
  ];

  const features: DemoFeature[] = [
    { title: t('demoPage.features.location.title'), description: t('demoPage.features.location.description'), icon: <MapPin className="w-6 h-6" />, badge: 'Agent' },
    { title: t('demoPage.features.network.title'), description: t('demoPage.features.network.description'), icon: <Network className="w-6 h-6" />, badge: 'Agent' },
    { title: t('demoPage.features.behavioral.title'), description: t('demoPage.features.behavioral.description'), icon: <User className="w-6 h-6" />, badge: 'Agent' },
    { title: t('demoPage.features.auth.title'), description: t('demoPage.features.auth.description'), icon: <Fingerprint className="w-6 h-6" />, badge: 'Agent' },
    { title: t('demoPage.features.realtime.title'), description: t('demoPage.features.realtime.description'), icon: <Zap className="w-6 h-6" /> },
    { title: t('demoPage.features.alerts.title'), description: t('demoPage.features.alerts.description'), icon: <Bell className="w-6 h-6" /> },
  ];

  const sections: DemoSection[] = [
    {
      title: t('demoPage.sections.transaction.title'),
      description: t('demoPage.sections.transaction.description'),
      features: [
        t('demoPage.sections.transaction.feature1'),
        t('demoPage.sections.transaction.feature2'),
        t('demoPage.sections.transaction.feature3'),
        t('demoPage.sections.transaction.feature4'),
      ],
    },
    {
      title: t('demoPage.sections.agents.title'),
      description: t('demoPage.sections.agents.description'),
      features: [
        t('demoPage.sections.agents.feature1'),
        t('demoPage.sections.agents.feature2'),
        t('demoPage.sections.agents.feature3'),
        t('demoPage.sections.agents.feature4'),
      ],
    },
    {
      title: t('demoPage.sections.dashboard.title'),
      description: t('demoPage.sections.dashboard.description'),
      features: [
        t('demoPage.sections.dashboard.feature1'),
        t('demoPage.sections.dashboard.feature2'),
        t('demoPage.sections.dashboard.feature3'),
        t('demoPage.sections.dashboard.feature4'),
      ],
    },
  ];

  return (
    <DemoPageTemplate
      title={t('demoPage.title')}
      titleHighlight={t('demoPage.titleHighlight')}
      subtitle={t('demoPage.subtitle')}
      heroIcon={<Shield className="w-24 h-24" />}
      scheduleDemoText={t('demoPage.scheduleCta')}
      onScheduleDemo={() => navigate('/contact')}
      steps={steps}
      stepsTitle={t('demoPage.stepsTitle')}
      features={features}
      featuresTitle={t('demoPage.featuresTitle')}
      sections={sections}
      platforms={['web', 'desktop']}
      platformsTitle={t('demoPage.platformsTitle')}
      ctaTitle={t('demoPage.ctaTitle')}
      ctaSubtitle={t('demoPage.ctaSubtitle')}
      ctaButton={t('demoPage.ctaButton')}
      ctaAction={() => navigate('/contact')}
      accentColor="fraud"
    />
  );
};

export default DemoPage;
