import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FeaturesPageTemplate, FeatureCategory, TechSpec } from '@olorin/shared';
import { Radio, Calendar, RefreshCw, BarChart3, Target, Music, Mic, Database, Volume2, Clock } from 'lucide-react';

const FeaturesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const s = (key: string) => String(t(key));

  const categories: FeatureCategory[] = [
    {
      title: s('featuresPage.automation.title'),
      description: s('featuresPage.automation.description'),
      features: [
        { title: s('featuresPage.automation.scheduling.title'), description: s('featuresPage.automation.scheduling.description'), icon: <Calendar className="w-8 h-8" />, highlights: [s('featuresPage.automation.scheduling.h1'), s('featuresPage.automation.scheduling.h2'), s('featuresPage.automation.scheduling.h3')], badge: 'Core' },
        { title: s('featuresPage.automation.playlists.title'), description: s('featuresPage.automation.playlists.description'), icon: <Music className="w-8 h-8" />, highlights: [s('featuresPage.automation.playlists.h1'), s('featuresPage.automation.playlists.h2'), s('featuresPage.automation.playlists.h3')] },
        { title: s('featuresPage.automation.transitions.title'), description: s('featuresPage.automation.transitions.description'), icon: <RefreshCw className="w-8 h-8" />, highlights: [s('featuresPage.automation.transitions.h1'), s('featuresPage.automation.transitions.h2'), s('featuresPage.automation.transitions.h3')] },
      ],
    },
    {
      title: s('featuresPage.analytics.title'),
      description: s('featuresPage.analytics.description'),
      features: [
        { title: s('featuresPage.analytics.listener.title'), description: s('featuresPage.analytics.listener.description'), icon: <BarChart3 className="w-8 h-8" />, highlights: [s('featuresPage.analytics.listener.h1'), s('featuresPage.analytics.listener.h2'), s('featuresPage.analytics.listener.h3')], badge: 'Popular' },
        { title: s('featuresPage.analytics.content.title'), description: s('featuresPage.analytics.content.description'), icon: <Target className="w-8 h-8" />, highlights: [s('featuresPage.analytics.content.h1'), s('featuresPage.analytics.content.h2'), s('featuresPage.analytics.content.h3')] },
        { title: s('featuresPage.analytics.realtime.title'), description: s('featuresPage.analytics.realtime.description'), icon: <Clock className="w-8 h-8" />, highlights: [s('featuresPage.analytics.realtime.h1'), s('featuresPage.analytics.realtime.h2'), s('featuresPage.analytics.realtime.h3')] },
      ],
    },
    {
      title: s('featuresPage.content.title'),
      description: s('featuresPage.content.description'),
      features: [
        { title: s('featuresPage.content.library.title'), description: s('featuresPage.content.library.description'), icon: <Database className="w-8 h-8" />, highlights: [s('featuresPage.content.library.h1'), s('featuresPage.content.library.h2'), s('featuresPage.content.library.h3')] },
        { title: s('featuresPage.content.voiceover.title'), description: s('featuresPage.content.voiceover.description'), icon: <Mic className="w-8 h-8" />, highlights: [s('featuresPage.content.voiceover.h1'), s('featuresPage.content.voiceover.h2'), s('featuresPage.content.voiceover.h3')], badge: 'AI' },
        { title: s('featuresPage.content.ads.title'), description: s('featuresPage.content.ads.description'), icon: <Volume2 className="w-8 h-8" />, highlights: [s('featuresPage.content.ads.h1'), s('featuresPage.content.ads.h2'), s('featuresPage.content.ads.h3')] },
      ],
    },
  ];

  const techSpecs: TechSpec[] = [
    { label: s('featuresPage.techSpecs.audioFormats.label'), value: s('featuresPage.techSpecs.audioFormats.value') },
    { label: s('featuresPage.techSpecs.streaming.label'), value: s('featuresPage.techSpecs.streaming.value') },
    { label: s('featuresPage.techSpecs.bitrates.label'), value: s('featuresPage.techSpecs.bitrates.value') },
    { label: s('featuresPage.techSpecs.automation.label'), value: s('featuresPage.techSpecs.automation.value') },
    { label: s('featuresPage.techSpecs.api.label'), value: s('featuresPage.techSpecs.api.value') },
    { label: s('featuresPage.techSpecs.integrations.label'), value: s('featuresPage.techSpecs.integrations.value') },
    { label: s('featuresPage.techSpecs.backup.label'), value: s('featuresPage.techSpecs.backup.value') },
    { label: s('featuresPage.techSpecs.uptimeSLA.label'), value: s('featuresPage.techSpecs.uptimeSLA.value') },
  ];

  const workflowSteps = [
    { title: s('featuresPage.workflow.s1.title'), description: s('featuresPage.workflow.s1.description'), icon: <Database className="w-6 h-6" /> },
    { title: s('featuresPage.workflow.s2.title'), description: s('featuresPage.workflow.s2.description'), icon: <RefreshCw className="w-6 h-6" /> },
    { title: s('featuresPage.workflow.s3.title'), description: s('featuresPage.workflow.s3.description'), icon: <Radio className="w-6 h-6" /> },
    { title: s('featuresPage.workflow.s4.title'), description: s('featuresPage.workflow.s4.description'), icon: <BarChart3 className="w-6 h-6" /> },
  ];

  return (
    <FeaturesPageTemplate
      title={s('featuresPage.title')}
      titleHighlight={s('featuresPage.titleHighlight')}
      subtitle={s('featuresPage.subtitle')}
      heroIcon={<Radio className="w-24 h-24" />}
      categories={categories}
      techSpecs={techSpecs}
      techSpecsTitle={s('featuresPage.techSpecsTitle')}
      workflowTitle={s('featuresPage.workflowTitle')}
      workflowSteps={workflowSteps}
      ctaTitle={s('featuresPage.ctaTitle')}
      ctaSubtitle={s('featuresPage.ctaSubtitle')}
      ctaButton={s('featuresPage.ctaButton')}
      ctaAction={() => navigate('/contact')}
      accentColor="radio"
    />
  );
};

export default FeaturesPage;
