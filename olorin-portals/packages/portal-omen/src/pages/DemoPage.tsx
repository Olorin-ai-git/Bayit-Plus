import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DemoPageTemplate, DemoStep, DemoFeature, DemoSection } from '@olorin/shared';
import { Mic, Languages, Volume2, Watch, Smartphone, MessageSquare, Zap, Headphones, Globe, Bluetooth } from 'lucide-react';

const DemoPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const steps: DemoStep[] = [
    { title: String(t('demoPage.steps.speak.title')), description: String(t('demoPage.steps.speak.description')), icon: <Mic className="w-6 h-6" /> },
    { title: String(t('demoPage.steps.transcribe.title')), description: String(t('demoPage.steps.transcribe.description')), icon: <MessageSquare className="w-6 h-6" /> },
    { title: String(t('demoPage.steps.translate.title')), description: String(t('demoPage.steps.translate.description')), icon: <Languages className="w-6 h-6" /> },
    { title: String(t('demoPage.steps.output.title')), description: String(t('demoPage.steps.output.description')), icon: <Volume2 className="w-6 h-6" /> },
  ];

  const features: DemoFeature[] = [
    { title: String(t('demoPage.features.realtime.title')), description: String(t('demoPage.features.realtime.description')), icon: <Zap className="w-6 h-6" /> },
    { title: String(t('demoPage.features.languages.title')), description: String(t('demoPage.features.languages.description')), icon: <Globe className="w-6 h-6" /> },
    { title: String(t('demoPage.features.voices.title')), description: String(t('demoPage.features.voices.description')), icon: <Headphones className="w-6 h-6" /> },
    { title: String(t('demoPage.features.wearable.title')), description: String(t('demoPage.features.wearable.description')), icon: <Watch className="w-6 h-6" /> },
    { title: String(t('demoPage.features.actionButton.title')), description: String(t('demoPage.features.actionButton.description')), icon: <Smartphone className="w-6 h-6" /> },
    { title: String(t('demoPage.features.bluetooth.title')), description: String(t('demoPage.features.bluetooth.description')), icon: <Bluetooth className="w-6 h-6" /> },
  ];

  const sections: DemoSection[] = [
    {
      title: String(t('demoPage.sections.transcription.title')),
      description: String(t('demoPage.sections.transcription.description')),
      features: [String(t('demoPage.sections.transcription.f1')), String(t('demoPage.sections.transcription.f2')), String(t('demoPage.sections.transcription.f3')), String(t('demoPage.sections.transcription.f4'))],
    },
    {
      title: String(t('demoPage.sections.translation.title')),
      description: String(t('demoPage.sections.translation.description')),
      features: [String(t('demoPage.sections.translation.f1')), String(t('demoPage.sections.translation.f2')), String(t('demoPage.sections.translation.f3')), String(t('demoPage.sections.translation.f4'))],
      reversed: true,
    },
    {
      title: String(t('demoPage.sections.wearable.title')),
      description: String(t('demoPage.sections.wearable.description')),
      features: [String(t('demoPage.sections.wearable.f1')), String(t('demoPage.sections.wearable.f2')), String(t('demoPage.sections.wearable.f3')), String(t('demoPage.sections.wearable.f4'))],
    },
  ];

  return (
    <DemoPageTemplate
      title={String(t('demoPage.title'))}
      titleHighlight={String(t('demoPage.titleHighlight'))}
      subtitle={String(t('demoPage.subtitle'))}
      heroIcon={<Mic className="w-24 h-24" />}
      scheduleDemoText={String(t('demoPage.scheduleCta'))}
      onScheduleDemo={() => navigate('/contact')}
      stepsTitle={String(t('demoPage.stepsTitle'))}
      steps={steps}
      featuresTitle={String(t('demoPage.featuresTitle'))}
      features={features}
      sections={sections}
      platformsTitle={String(t('demoPage.platformsTitle'))}
      platforms={['mobile']}
      ctaTitle={String(t('demoPage.ctaTitle'))}
      ctaSubtitle={String(t('demoPage.ctaSubtitle'))}
      ctaButton={String(t('demoPage.ctaButton'))}
      ctaAction={() => navigate('/contact')}
      accentColor="omen"
    />
  );
};

export default DemoPage;
