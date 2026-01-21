import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon } from '@olorin/shared';
import { Shield, Radio, Play, Sparkles, Mic, Zap, Users, Globe } from 'lucide-react';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const solutions = [
    {
      icon: <Shield className="w-16 h-16" />,
      color: 'fraud' as const,
      title: t('solutions.fraud.title'),
      description: t('solutions.fraud.description'),
      href: process.env.REACT_APP_FRAUD_URL || 'https://fraud.olorin.ai',
      cta: t('solutions.fraud.cta'),
      badge: t('solutions.fraud.badge'),
    },
    {
      icon: <Play className="w-16 h-16" />,
      color: 'streaming' as const,
      title: t('solutions.streaming.title'),
      description: t('solutions.streaming.description'),
      href: process.env.REACT_APP_STREAMING_URL || 'https://streaming.olorin.ai',
      cta: t('solutions.streaming.cta'),
      badge: t('solutions.streaming.badge'),
    },
    {
      icon: <Radio className="w-16 h-16" />,
      color: 'radio' as const,
      title: t('solutions.radio.title'),
      description: t('solutions.radio.description'),
      href: process.env.REACT_APP_RADIO_URL || 'https://radio.olorin.ai',
      cta: t('solutions.radio.cta'),
      badge: t('solutions.radio.badge'),
    },
    {
      icon: <Mic className="w-16 h-16" />,
      color: 'omen' as const,
      title: t('solutions.omen.title'),
      description: t('solutions.omen.description'),
      href: process.env.REACT_APP_OMEN_URL || 'https://omen.olorin.ai',
      cta: t('solutions.omen.cta'),
      badge: t('solutions.omen.badge'),
    },
  ];

  const highlights = [
    { icon: <Zap className="w-8 h-8" />, title: t('highlights.ai.title'), description: t('highlights.ai.description') },
    { icon: <Users className="w-8 h-8" />, title: t('highlights.active.title'), description: t('highlights.active.description') },
    { icon: <Globe className="w-8 h-8" />, title: t('highlights.global.title'), description: t('highlights.global.description') },
  ];

  return (
    <div className="homepage">
      <HeroSection
        title={t('hero.title')}
        titleHighlight={t('hero.titleHighlight')}
        subtitle={t('hero.description')}
        primaryCTA={{ text: t('hero.ctaExplore'), onClick: () => document.getElementById('solutions')?.scrollIntoView({ behavior: 'smooth' }) }}
        secondaryCTA={{ text: t('hero.ctaGetStarted'), onClick: () => navigate('/contact') }}
        icon={<Sparkles className="w-32 h-32" />}
        backgroundPattern="particles"
      />

      <section id="solutions" className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4 wizard-text">{t('solutions.sectionTitle')}</h2>
            <p className="text-lg md:text-xl text-wizard-text-secondary max-w-3xl mx-auto">{t('solutions.sectionSubtitle')}</p>
          </div>
          <div className="wizard-grid-4">
            {solutions.map((solution, index) => (
              <GlassCard
                key={solution.title}
                variant="interactive"
                className={`p-8 text-center animate-fade-in-up animate-delay-${index + 1}00 relative`}
                onClick={() => solution.href.startsWith('http') ? window.location.href = solution.href : navigate(solution.href)}
              >
                {solution.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 text-xs font-semibold bg-wizard-accent-purple/20 text-wizard-accent-purple rounded-full">{solution.badge}</span>
                  </div>
                )}
                <div className="mb-6 flex justify-center"><GlowingIcon icon={solution.icon} color={solution.color} size="xl" animate /></div>
                <h3 className="text-xl font-bold text-wizard-text-primary mb-3">{solution.title}</h3>
                <p className="text-wizard-text-secondary mb-6">{solution.description}</p>
                <span className="wizard-text font-semibold hover:underline">{solution.cta} →</span>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-8">{t('about.title')}</h2>
            <div className="wizard-grid-2 gap-12 text-left">
              <GlassCard className="p-8">
                <h3 className="text-2xl font-bold wizard-text mb-4">{t('about.mission.title')}</h3>
                <p className="text-wizard-text-secondary leading-relaxed">{t('about.mission.content')}</p>
              </GlassCard>
              <GlassCard className="p-8">
                <h3 className="text-2xl font-bold wizard-text mb-4">{t('about.vision.title')}</h3>
                <p className="text-wizard-text-secondary leading-relaxed">{t('about.vision.content')}</p>
              </GlassCard>
            </div>
            <div className="mt-12">
              <button onClick={() => navigate('/about')} className="wizard-button">Learn More About Us</button>
            </div>
          </div>
        </div>
      </section>

      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-wizard-text-primary mb-4">{t('highlights.title')}</h2>
            <p className="text-wizard-text-secondary">{t('highlights.subtitle')}</p>
          </div>
          <div className="wizard-grid-3">
            {highlights.map((item, index) => (
              <GlassCard key={item.title} className={`p-6 text-center animate-fade-in-up animate-delay-${index + 1}00`}>
                <div className="mb-4 flex justify-center"><GlowingIcon icon={item.icon} color="main" size="lg" /></div>
                <h3 className="text-lg font-bold wizard-text mb-2">{item.title}</h3>
                <p className="text-sm text-wizard-text-secondary">{item.description}</p>
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
            <button onClick={() => navigate('/contact')} className="wizard-button text-lg px-10 py-4">{t('cta.button')}</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
