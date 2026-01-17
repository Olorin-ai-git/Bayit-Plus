import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon } from '@olorin/shared';
import { Shield, Radio, Play, Sparkles, CheckCircle } from 'lucide-react';

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
    },
    {
      icon: <Play className="w-16 h-16" />,
      color: 'streaming' as const,
      title: t('solutions.streaming.title'),
      description: t('solutions.streaming.description'),
      href: process.env.REACT_APP_STREAMING_URL || 'https://streaming.olorin.ai',
      cta: t('solutions.streaming.cta'),
    },
    {
      icon: <Radio className="w-16 h-16" />,
      color: 'radio' as const,
      title: t('solutions.radio.title'),
      description: t('solutions.radio.description'),
      href: process.env.REACT_APP_RADIO_URL || 'https://radio.olorin.ai',
      cta: t('solutions.radio.cta'),
    },
    {
      icon: <Sparkles className="w-16 h-16" />,
      color: 'main' as const,
      title: t('solutions.generative.title'),
      description: t('solutions.generative.description'),
      href: '/contact',
      cta: t('solutions.generative.cta'),
    },
  ];

  const certifications = [
    'SOC 2',
    'GDPR',
    'CCPA',
    'ISO 27001',
  ];

  return (
    <div className="homepage">
      {/* Hero Section */}
      <HeroSection
        title={t('hero.title')}
        titleHighlight={t('hero.titleHighlight')}
        subtitle={t('hero.description')}
        primaryCTA={{
          text: t('hero.ctaExplore'),
          onClick: () => {
            document.getElementById('solutions')?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        secondaryCTA={{
          text: t('hero.ctaGetStarted'),
          onClick: () => navigate('/contact')
        }}
        icon={<Sparkles className="w-32 h-32" />}
        backgroundPattern="particles"
      />

      {/* Solutions Grid */}
      <section id="solutions" className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4 wizard-text">
              {t('solutions.sectionTitle')}
            </h2>
            <p className="text-lg md:text-xl text-wizard-text-secondary max-w-3xl mx-auto">
              {t('solutions.sectionSubtitle')}
            </p>
          </div>

          <div className="wizard-grid-4">
            {solutions.map((solution, index) => (
              <GlassCard
                key={solution.title}
                variant="interactive"
                className={`p-8 text-center animate-fade-in-up animate-delay-${index + 1}00`}
                onClick={() => {
                  if (solution.href.startsWith('http')) {
                    window.location.href = solution.href;
                  } else {
                    navigate(solution.href);
                  }
                }}
              >
                <div className="mb-6 flex justify-center">
                  <GlowingIcon
                    icon={solution.icon}
                    color={solution.color}
                    size="xl"
                    animate
                  />
                </div>
                <h3 className="text-xl font-bold text-wizard-text-primary mb-3">
                  {solution.title}
                </h3>
                <p className="text-wizard-text-secondary mb-6">
                  {solution.description}
                </p>
                <span className="wizard-text font-semibold hover:underline">
                  {solution.cta} →
                </span>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* About Section (Brief) */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-8">
              {t('about.title')}
            </h2>
            <div className="wizard-grid-2 gap-12 text-left">
              <GlassCard className="p-8">
                <h3 className="text-2xl font-bold wizard-text mb-4">
                  {t('about.mission.title')}
                </h3>
                <p className="text-wizard-text-secondary leading-relaxed">
                  {t('about.mission.content')}
                </p>
              </GlassCard>
              <GlassCard className="p-8">
                <h3 className="text-2xl font-bold wizard-text mb-4">
                  {t('about.vision.title')}
                </h3>
                <p className="text-wizard-text-secondary leading-relaxed">
                  {t('about.vision.content')}
                </p>
              </GlassCard>
            </div>
            <div className="mt-12">
              <button
                onClick={() => navigate('/about')}
                className="wizard-button"
              >
                Learn More About Us
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-wizard-text-primary mb-4">
              {t('trustIndicators.title')}
            </h2>
            <p className="text-wizard-text-secondary mb-12">
              {t('trustIndicators.certifications')}
            </p>
            <div className="flex flex-wrap justify-center gap-8">
              {certifications.map((cert) => (
                <div
                  key={cert}
                  className="flex items-center space-x-2 text-wizard-accent-purple"
                >
                  <CheckCircle className="w-6 h-6 glow-icon" />
                  <span className="font-semibold text-lg">{cert}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="wizard-section wizard-gradient-bg wizard-particles">
        <div className="wizard-container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-6">
              {t('cta.title')}
            </h2>
            <p className="text-lg md:text-xl text-wizard-text-secondary mb-10">
              {t('cta.subtitle')}
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="wizard-button text-lg px-10 py-4"
            >
              {t('cta.button')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
