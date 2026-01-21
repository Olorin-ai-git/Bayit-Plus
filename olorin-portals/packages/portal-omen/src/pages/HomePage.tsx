import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon } from '@olorin/shared';
import { Mic, Languages, Volume2, Watch, Smartphone, Globe, Headphones, MessageSquare } from 'lucide-react';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = [
    { icon: <Mic className="w-12 h-12" />, color: 'omen' as const, title: t('features.transcription.title'), description: t('features.transcription.description') },
    { icon: <Languages className="w-12 h-12" />, color: 'omen' as const, title: t('features.translation.title'), description: t('features.translation.description') },
    { icon: <Volume2 className="w-12 h-12" />, color: 'omen' as const, title: t('features.tts.title'), description: t('features.tts.description') },
  ];

  const workflowSteps = [
    { icon: <Mic className="w-10 h-10" />, color: 'omen' as const, title: t('workflow.step1.title'), description: t('workflow.step1.description') },
    { icon: <MessageSquare className="w-10 h-10" />, color: 'omen' as const, title: t('workflow.step2.title'), description: t('workflow.step2.description') },
    { icon: <Languages className="w-10 h-10" />, color: 'omen' as const, title: t('workflow.step3.title'), description: t('workflow.step3.description') },
    { icon: <Volume2 className="w-10 h-10" />, color: 'omen' as const, title: t('workflow.step4.title'), description: t('workflow.step4.description') },
  ];

  const capabilities = [
    { icon: <Watch className="w-10 h-10" />, name: t('capabilities.wearable.title'), description: t('capabilities.wearable.description') },
    { icon: <Smartphone className="w-10 h-10" />, name: t('capabilities.actionButton.title'), description: t('capabilities.actionButton.description') },
    { icon: <Globe className="w-10 h-10" />, name: t('capabilities.languages.title'), description: t('capabilities.languages.description') },
    { icon: <Headphones className="w-10 h-10" />, name: t('capabilities.voices.title'), description: t('capabilities.voices.description') },
  ];

  const languages = ['Spanish', 'French', 'German', 'Japanese', 'Mandarin'];

  return (
    <div className="omen-homepage">
      <HeroSection
        title={t('hero.title')}
        titleHighlight={t('hero.titleHighlight')}
        subtitle={t('hero.description')}
        primaryCTA={{ text: t('hero.ctaExplore'), onClick: () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }}
        secondaryCTA={{ text: t('hero.ctaDemo'), onClick: () => navigate('/contact') }}
        icon={<Mic className="w-32 h-32" />}
        backgroundPattern="circuit"
      />

      <section id="features" className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4 wizard-text">{t('features.sectionTitle')}</h2>
          </div>
          <div className="wizard-grid-3">
            {features.map((feature, index) => (
              <GlassCard key={feature.title} variant="interactive" className={`p-8 text-center animate-fade-in-up animate-delay-${index + 1}00`}>
                <div className="mb-6 flex justify-center"><GlowingIcon icon={feature.icon} color={feature.color} size="xl" animate /></div>
                <h3 className="text-xl font-bold text-wizard-text-primary mb-3">{feature.title}</h3>
                <p className="text-wizard-text-secondary">{feature.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4 wizard-text">{t('workflow.sectionTitle')}</h2>
            <p className="text-lg md:text-xl text-wizard-text-secondary max-w-3xl mx-auto">{t('workflow.sectionSubtitle')}</p>
          </div>
          <div className="wizard-grid-4">
            {workflowSteps.map((step, index) => (
              <GlassCard key={step.title} className={`p-6 animate-fade-in-up animate-delay-${index + 1}00`}>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-wizard-accent-omen/20 border-2 border-wizard-accent-omen flex items-center justify-center font-bold text-wizard-accent-omen text-xl">{index + 1}</div>
                  <GlowingIcon icon={step.icon} color={step.color} size="md" />
                </div>
                <h3 className="text-xl font-bold text-wizard-text-primary mb-3">{step.title}</h3>
                <p className="text-wizard-text-secondary">{step.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="max-w-5xl mx-auto">
            <GlassCard variant="hero" className="p-12">
              <div className="text-center mb-8">
                <GlowingIcon icon={<Languages className="w-16 h-16" />} color="omen" size="xl" animate />
                <h2 className="text-3xl md:text-4xl font-bold wizard-text mt-6 mb-4">{t('languages.title')}</h2>
                <p className="text-lg text-wizard-text-secondary">{t('languages.subtitle')}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {languages.map((lang) => (
                  <div key={lang} className="px-6 py-3 bg-wizard-accent-omen/20 border border-wizard-accent-omen/40 rounded-full">
                    <span className="text-wizard-text-primary font-medium">{lang}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4">{t('capabilities.title')}</h2>
          </div>
          <div className="wizard-grid-4">
            {capabilities.map((capability, index) => (
              <GlassCard key={capability.name} variant="interactive" className={`p-6 animate-fade-in-up animate-delay-${index + 1}00`}>
                <div className="mb-4 flex justify-center"><GlowingIcon icon={capability.icon} color="omen" size="lg" /></div>
                <h3 className="text-lg font-bold wizard-text mb-3">{capability.name}</h3>
                <p className="text-sm text-wizard-text-secondary">{capability.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section className="wizard-section wizard-gradient-bg wizard-particles">
        <div className="wizard-container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-6">{t('cta.title')}</h2>
            <p className="text-lg md:text-xl text-wizard-text-secondary mb-10">{t('cta.subtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => navigate('/contact')} className="wizard-button text-lg px-10 py-4">{t('cta.button')}</button>
            </div>
            <p className="text-wizard-text-muted mt-6 text-sm">{t('cta.platforms')}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
