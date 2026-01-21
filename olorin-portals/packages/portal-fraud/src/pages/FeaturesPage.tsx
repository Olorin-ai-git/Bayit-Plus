import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FeaturesPageTemplate, FeatureCategory, TechSpec } from '@olorin/shared';
import { Shield, Zap, Bell, BarChart3, Lock, Globe, Database, RefreshCw, AlertTriangle, Gauge, Settings, Cloud } from 'lucide-react';

const FeaturesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const categories: FeatureCategory[] = [
    {
      title: t('featuresPage.detection.title'),
      description: t('featuresPage.detection.description'),
      features: [
        {
          title: t('featuresPage.detection.realtime.title'),
          description: t('featuresPage.detection.realtime.description'),
          icon: <Zap className="w-8 h-8" />,
          highlights: [t('featuresPage.detection.realtime.h1'), t('featuresPage.detection.realtime.h2'), t('featuresPage.detection.realtime.h3')],
          badge: 'Core',
        },
        {
          title: t('featuresPage.detection.ml.title'),
          description: t('featuresPage.detection.ml.description'),
          icon: <BarChart3 className="w-8 h-8" />,
          highlights: [t('featuresPage.detection.ml.h1'), t('featuresPage.detection.ml.h2'), t('featuresPage.detection.ml.h3')],
        },
        {
          title: t('featuresPage.detection.scoring.title'),
          description: t('featuresPage.detection.scoring.description'),
          icon: <Gauge className="w-8 h-8" />,
          highlights: [t('featuresPage.detection.scoring.h1'), t('featuresPage.detection.scoring.h2'), t('featuresPage.detection.scoring.h3')],
        },
      ],
    },
    {
      title: t('featuresPage.alerts.title'),
      description: t('featuresPage.alerts.description'),
      features: [
        {
          title: t('featuresPage.alerts.instant.title'),
          description: t('featuresPage.alerts.instant.description'),
          icon: <Bell className="w-8 h-8" />,
          highlights: [t('featuresPage.alerts.instant.h1'), t('featuresPage.alerts.instant.h2'), t('featuresPage.alerts.instant.h3')],
          badge: 'Popular',
        },
        {
          title: t('featuresPage.alerts.rules.title'),
          description: t('featuresPage.alerts.rules.description'),
          icon: <Settings className="w-8 h-8" />,
          highlights: [t('featuresPage.alerts.rules.h1'), t('featuresPage.alerts.rules.h2'), t('featuresPage.alerts.rules.h3')],
        },
        {
          title: t('featuresPage.alerts.escalation.title'),
          description: t('featuresPage.alerts.escalation.description'),
          icon: <AlertTriangle className="w-8 h-8" />,
          highlights: [t('featuresPage.alerts.escalation.h1'), t('featuresPage.alerts.escalation.h2'), t('featuresPage.alerts.escalation.h3')],
        },
      ],
    },
    {
      title: t('featuresPage.integration.title'),
      description: t('featuresPage.integration.description'),
      features: [
        {
          title: t('featuresPage.integration.api.title'),
          description: t('featuresPage.integration.api.description'),
          icon: <Cloud className="w-8 h-8" />,
          highlights: [t('featuresPage.integration.api.h1'), t('featuresPage.integration.api.h2'), t('featuresPage.integration.api.h3')],
        },
        {
          title: t('featuresPage.integration.security.title'),
          description: t('featuresPage.integration.security.description'),
          icon: <Lock className="w-8 h-8" />,
          highlights: [t('featuresPage.integration.security.h1'), t('featuresPage.integration.security.h2'), t('featuresPage.integration.security.h3')],
          badge: 'Enterprise',
        },
        {
          title: t('featuresPage.integration.global.title'),
          description: t('featuresPage.integration.global.description'),
          icon: <Globe className="w-8 h-8" />,
          highlights: [t('featuresPage.integration.global.h1'), t('featuresPage.integration.global.h2'), t('featuresPage.integration.global.h3')],
        },
      ],
    },
  ];

  const techSpecs: TechSpec[] = [
    { label: 'Response Time', value: '< 100ms' },
    { label: 'Uptime SLA', value: '99.99%' },
    { label: 'Data Encryption', value: 'AES-256' },
    { label: 'API Protocol', value: 'REST / GraphQL' },
    { label: 'Concurrent Users', value: 'Unlimited' },
    { label: 'Data Retention', value: 'Configurable' },
    { label: 'Deployment Options', value: 'Cloud / On-Premise' },
    { label: 'Compliance', value: 'SOC 2, GDPR Ready' },
  ];

  const workflowSteps = [
    { title: t('featuresPage.workflow.step1.title'), description: t('featuresPage.workflow.step1.description'), icon: <Database className="w-6 h-6" /> },
    { title: t('featuresPage.workflow.step2.title'), description: t('featuresPage.workflow.step2.description'), icon: <RefreshCw className="w-6 h-6" /> },
    { title: t('featuresPage.workflow.step3.title'), description: t('featuresPage.workflow.step3.description'), icon: <AlertTriangle className="w-6 h-6" /> },
    { title: t('featuresPage.workflow.step4.title'), description: t('featuresPage.workflow.step4.description'), icon: <Gauge className="w-6 h-6" /> },
  ];

  return (
    <FeaturesPageTemplate
      title={t('featuresPage.title')}
      titleHighlight={t('featuresPage.titleHighlight')}
      subtitle={t('featuresPage.subtitle')}
      heroIcon={<Shield className="w-24 h-24" />}
      categories={categories}
      techSpecs={techSpecs}
      techSpecsTitle={t('featuresPage.techSpecsTitle')}
      workflowTitle={t('featuresPage.workflowTitle')}
      workflowSteps={workflowSteps}
      ctaTitle={t('featuresPage.ctaTitle')}
      ctaSubtitle={t('featuresPage.ctaSubtitle')}
      ctaButton={t('featuresPage.ctaButton')}
      ctaAction={() => navigate('/contact')}
      accentColor="fraud"
    />
  );
};

export default FeaturesPage;
