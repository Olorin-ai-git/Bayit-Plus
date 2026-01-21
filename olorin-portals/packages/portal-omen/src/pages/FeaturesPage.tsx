import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FeaturesPageTemplate, FeatureCategory, TechSpec } from '@olorin/shared';
import { Mic, Languages, Volume2, Watch, Smartphone, Zap, Globe, MessageSquare, Bluetooth, Cpu } from 'lucide-react';

const FeaturesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const s = (key: string) => String(t(key));

  const categories: FeatureCategory[] = [
    {
      title: s('featuresPage.transcription.title'),
      description: s('featuresPage.transcription.description'),
      features: [
        { title: s('featuresPage.transcription.realtime.title'), description: s('featuresPage.transcription.realtime.description'), icon: <Mic className="w-8 h-8" />, highlights: [s('featuresPage.transcription.realtime.h1'), s('featuresPage.transcription.realtime.h2'), s('featuresPage.transcription.realtime.h3')], badge: 'Core' },
        { title: s('featuresPage.transcription.accuracy.title'), description: s('featuresPage.transcription.accuracy.description'), icon: <Cpu className="w-8 h-8" />, highlights: [s('featuresPage.transcription.accuracy.h1'), s('featuresPage.transcription.accuracy.h2'), s('featuresPage.transcription.accuracy.h3')] },
        { title: s('featuresPage.transcription.waveform.title'), description: s('featuresPage.transcription.waveform.description'), icon: <Zap className="w-8 h-8" />, highlights: [s('featuresPage.transcription.waveform.h1'), s('featuresPage.transcription.waveform.h2'), s('featuresPage.transcription.waveform.h3')] },
      ],
    },
    {
      title: s('featuresPage.translation.title'),
      description: s('featuresPage.translation.description'),
      features: [
        { title: s('featuresPage.translation.instant.title'), description: s('featuresPage.translation.instant.description'), icon: <Languages className="w-8 h-8" />, highlights: [s('featuresPage.translation.instant.h1'), s('featuresPage.translation.instant.h2'), s('featuresPage.translation.instant.h3')], badge: 'AI' },
        { title: s('featuresPage.translation.languages.title'), description: s('featuresPage.translation.languages.description'), icon: <Globe className="w-8 h-8" />, highlights: [s('featuresPage.translation.languages.h1'), s('featuresPage.translation.languages.h2'), s('featuresPage.translation.languages.h3')] },
        { title: s('featuresPage.translation.tts.title'), description: s('featuresPage.translation.tts.description'), icon: <Volume2 className="w-8 h-8" />, highlights: [s('featuresPage.translation.tts.h1'), s('featuresPage.translation.tts.h2'), s('featuresPage.translation.tts.h3')] },
      ],
    },
    {
      title: s('featuresPage.hardware.title'),
      description: s('featuresPage.hardware.description'),
      features: [
        { title: s('featuresPage.hardware.wearable.title'), description: s('featuresPage.hardware.wearable.description'), icon: <Watch className="w-8 h-8" />, highlights: [s('featuresPage.hardware.wearable.h1'), s('featuresPage.hardware.wearable.h2'), s('featuresPage.hardware.wearable.h3')], badge: 'New' },
        { title: s('featuresPage.hardware.actionButton.title'), description: s('featuresPage.hardware.actionButton.description'), icon: <Smartphone className="w-8 h-8" />, highlights: [s('featuresPage.hardware.actionButton.h1'), s('featuresPage.hardware.actionButton.h2'), s('featuresPage.hardware.actionButton.h3')] },
        { title: s('featuresPage.hardware.bluetooth.title'), description: s('featuresPage.hardware.bluetooth.description'), icon: <Bluetooth className="w-8 h-8" />, highlights: [s('featuresPage.hardware.bluetooth.h1'), s('featuresPage.hardware.bluetooth.h2'), s('featuresPage.hardware.bluetooth.h3')] },
      ],
    },
  ];

  const techSpecs: TechSpec[] = [
    { label: 'Audio Input', value: '16kHz Sample Rate' },
    { label: 'Languages', value: '5 Languages' },
    { label: 'Latency', value: '< 100ms' },
    { label: 'Platform', value: 'iOS 17.0+' },
    { label: 'Devices', value: 'iPhone 15/16' },
    { label: 'TTS Engine', value: 'ElevenLabs' },
    { label: 'Transcription', value: 'OpenAI Realtime' },
    { label: 'Wearable', value: 'ESP32 BLE' },
  ];

  const workflowSteps = [
    { title: s('featuresPage.workflow.s1.title'), description: s('featuresPage.workflow.s1.description'), icon: <Mic className="w-6 h-6" /> },
    { title: s('featuresPage.workflow.s2.title'), description: s('featuresPage.workflow.s2.description'), icon: <MessageSquare className="w-6 h-6" /> },
    { title: s('featuresPage.workflow.s3.title'), description: s('featuresPage.workflow.s3.description'), icon: <Languages className="w-6 h-6" /> },
    { title: s('featuresPage.workflow.s4.title'), description: s('featuresPage.workflow.s4.description'), icon: <Volume2 className="w-6 h-6" /> },
  ];

  return (
    <FeaturesPageTemplate
      title={s('featuresPage.title')}
      titleHighlight={s('featuresPage.titleHighlight')}
      subtitle={s('featuresPage.subtitle')}
      heroIcon={<Mic className="w-24 h-24" />}
      categories={categories}
      techSpecs={techSpecs}
      techSpecsTitle={s('featuresPage.techSpecsTitle')}
      workflowTitle={s('featuresPage.workflowTitle')}
      workflowSteps={workflowSteps}
      ctaTitle={s('featuresPage.ctaTitle')}
      ctaSubtitle={s('featuresPage.ctaSubtitle')}
      ctaButton={s('featuresPage.ctaButton')}
      ctaAction={() => navigate('/contact')}
      accentColor="omen"
    />
  );
};

export default FeaturesPage;
