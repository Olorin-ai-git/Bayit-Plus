import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FeaturesPageTemplate, FeatureCategory, TechSpec } from '@olorin/shared';
import { Play, Zap, BarChart3, Users, Globe, Wifi, Settings, Shield, Tv, Film, RefreshCw, Clock } from 'lucide-react';

const FeaturesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const s = (key: string) => String(t(key));

  const categories: FeatureCategory[] = [
    {
      title: s('featuresPage.delivery.title'),
      description: s('featuresPage.delivery.description'),
      features: [
        { title: s('featuresPage.delivery.adaptive.title'), description: s('featuresPage.delivery.adaptive.description'), icon: <Zap className="w-8 h-8" />, highlights: [s('featuresPage.delivery.adaptive.h1'), s('featuresPage.delivery.adaptive.h2'), s('featuresPage.delivery.adaptive.h3')], badge: 'Core' },
        { title: s('featuresPage.delivery.cdn.title'), description: s('featuresPage.delivery.cdn.description'), icon: <Globe className="w-8 h-8" />, highlights: [s('featuresPage.delivery.cdn.h1'), s('featuresPage.delivery.cdn.h2'), s('featuresPage.delivery.cdn.h3')] },
        { title: s('featuresPage.delivery.quality.title'), description: s('featuresPage.delivery.quality.description'), icon: <Tv className="w-8 h-8" />, highlights: [s('featuresPage.delivery.quality.h1'), s('featuresPage.delivery.quality.h2'), s('featuresPage.delivery.quality.h3')] },
      ],
    },
    {
      title: s('featuresPage.analytics.title'),
      description: s('featuresPage.analytics.description'),
      features: [
        { title: s('featuresPage.analytics.realtime.title'), description: s('featuresPage.analytics.realtime.description'), icon: <BarChart3 className="w-8 h-8" />, highlights: [s('featuresPage.analytics.realtime.h1'), s('featuresPage.analytics.realtime.h2'), s('featuresPage.analytics.realtime.h3')], badge: 'Popular' },
        { title: s('featuresPage.analytics.engagement.title'), description: s('featuresPage.analytics.engagement.description'), icon: <Users className="w-8 h-8" />, highlights: [s('featuresPage.analytics.engagement.h1'), s('featuresPage.analytics.engagement.h2'), s('featuresPage.analytics.engagement.h3')] },
        { title: s('featuresPage.analytics.qoe.title'), description: s('featuresPage.analytics.qoe.description'), icon: <Clock className="w-8 h-8" />, highlights: [s('featuresPage.analytics.qoe.h1'), s('featuresPage.analytics.qoe.h2'), s('featuresPage.analytics.qoe.h3')] },
      ],
    },
    {
      title: s('featuresPage.platform.title'),
      description: s('featuresPage.platform.description'),
      features: [
        { title: s('featuresPage.platform.player.title'), description: s('featuresPage.platform.player.description'), icon: <Play className="w-8 h-8" />, highlights: [s('featuresPage.platform.player.h1'), s('featuresPage.platform.player.h2'), s('featuresPage.platform.player.h3')] },
        { title: s('featuresPage.platform.api.title'), description: s('featuresPage.platform.api.description'), icon: <Settings className="w-8 h-8" />, highlights: [s('featuresPage.platform.api.h1'), s('featuresPage.platform.api.h2'), s('featuresPage.platform.api.h3')], badge: 'Enterprise' },
        { title: s('featuresPage.platform.security.title'), description: s('featuresPage.platform.security.description'), icon: <Shield className="w-8 h-8" />, highlights: [s('featuresPage.platform.security.h1'), s('featuresPage.platform.security.h2'), s('featuresPage.platform.security.h3')] },
      ],
    },
  ];

  const techSpecs: TechSpec[] = [
    { label: s('featuresPage.techSpecs.videoCodecs.label'), value: s('featuresPage.techSpecs.videoCodecs.value') },
    { label: s('featuresPage.techSpecs.maxResolution.label'), value: s('featuresPage.techSpecs.maxResolution.value') },
    { label: s('featuresPage.techSpecs.latency.label'), value: s('featuresPage.techSpecs.latency.value') },
    { label: s('featuresPage.techSpecs.cdnCoverage.label'), value: s('featuresPage.techSpecs.cdnCoverage.value') },
    { label: s('featuresPage.techSpecs.concurrentViewers.label'), value: s('featuresPage.techSpecs.concurrentViewers.value') },
    { label: s('featuresPage.techSpecs.drmSupport.label'), value: s('featuresPage.techSpecs.drmSupport.value') },
    { label: s('featuresPage.techSpecs.protocolSupport.label'), value: s('featuresPage.techSpecs.protocolSupport.value') },
    { label: s('featuresPage.techSpecs.uptimeSla.label'), value: s('featuresPage.techSpecs.uptimeSla.value') },
  ];

  const workflowSteps = [
    { title: s('featuresPage.workflow.s1.title'), description: s('featuresPage.workflow.s1.description'), icon: <Film className="w-6 h-6" /> },
    { title: s('featuresPage.workflow.s2.title'), description: s('featuresPage.workflow.s2.description'), icon: <RefreshCw className="w-6 h-6" /> },
    { title: s('featuresPage.workflow.s3.title'), description: s('featuresPage.workflow.s3.description'), icon: <Wifi className="w-6 h-6" /> },
    { title: s('featuresPage.workflow.s4.title'), description: s('featuresPage.workflow.s4.description'), icon: <Play className="w-6 h-6" /> },
  ];

  return (
    <FeaturesPageTemplate
      title={s('featuresPage.title')}
      titleHighlight={s('featuresPage.titleHighlight')}
      subtitle={s('featuresPage.subtitle')}
      heroIcon={<Play className="w-24 h-24" />}
      categories={categories}
      techSpecs={techSpecs}
      techSpecsTitle={s('featuresPage.techSpecsTitle')}
      workflowTitle={s('featuresPage.workflowTitle')}
      workflowSteps={workflowSteps}
      ctaTitle={s('featuresPage.ctaTitle')}
      ctaSubtitle={s('featuresPage.ctaSubtitle')}
      ctaButton={s('featuresPage.ctaButton')}
      ctaAction={() => navigate('/contact')}
      accentColor="streaming"
    />
  );
};

export default FeaturesPage;
