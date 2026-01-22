/**
 * HomePage - Bayit Plus Marketing Portal
 * Showcases Israeli streaming content for expats worldwide
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, PlatformGrid, GlassButton } from '@olorin/shared';
import { Film, Tv, Radio, Sparkles, Baby, Download } from 'lucide-react';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = [
    {
      icon: <Film className="w-12 h-12" />,
      title: t('features.vod.title'),
      description: t('features.vod.description'),
    },
    {
      icon: <Tv className="w-12 h-12" />,
      title: t('features.liveTV.title'),
      description: t('features.liveTV.description'),
    },
    {
      icon: <Radio className="w-12 h-12" />,
      title: t('features.radio.title'),
      description: t('features.radio.description'),
    },
    {
      icon: <Sparkles className="w-12 h-12" />,
      title: t('features.ai.title'),
      description: t('features.ai.description'),
    },
    {
      icon: <Baby className="w-12 h-12" />,
      title: t('features.kids.title'),
      description: t('features.kids.description'),
    },
    {
      icon: <Download className="w-12 h-12" />,
      title: t('features.downloads.title'),
      description: t('features.downloads.description'),
    },
  ];

  const stats = [
    { value: t('stats.channels.value'), label: t('stats.channels.label') },
    { value: t('stats.content.value'), label: t('stats.content.label') },
    { value: t('stats.radio.value'), label: t('stats.radio.label') },
    { value: t('stats.uptime.value'), label: t('stats.uptime.label') },
  ];

  return (
    <div className="streaming-homepage">
      {/* Hero Section */}
      <HeroSection
        title={t('hero.title')}
        titleHighlight={t('hero.titleHighlight')}
        subtitle={t('hero.description')}
        primaryCTA={{
          text: t('hero.ctaDemo'),
          onClick: () => navigate('/pricing')
        }}
        secondaryCTA={{
          text: t('hero.ctaExplore'),
          onClick: () => navigate('/pricing')
        }}
        backgroundPattern="gradient"
      />

      {/* Features Section */}
      <section id="features" className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4 wizard-text">
              {t('features.sectionTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <GlassCard
                key={feature.title}
                variant="interactive"
                className={`p-8 text-center animate-fade-in-up animate-delay-${index + 1}00`}
              >
                <div className="mb-6 flex justify-center text-wizard-accent-purple">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-wizard-text-primary mb-3">
                  {feature.title}
                </h3>
                <p className="text-wizard-text-secondary">
                  {feature.description}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="max-w-5xl mx-auto">
            <GlassCard variant="hero" className="p-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl md:text-4xl font-bold wizard-text mb-2">
                      {stat.value}
                    </div>
                    <div className="text-wizard-text-secondary text-sm">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4">
              {t('platforms.sectionTitle')}
            </h2>
            <p className="text-lg md:text-xl text-wizard-text-secondary max-w-3xl mx-auto">
              {t('platforms.sectionSubtitle')}
            </p>
          </div>

          <PlatformGrid
            platforms={['ios', 'android', 'web', 'webos', 'tizen']}
            size="md"
            columns={6}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="wizard-section wizard-gradient-bg wizard-particles">
        <div className="wizard-container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-6">
              {t('cta.title')}
            </h2>
            <p className="text-lg md:text-xl text-wizard-text-secondary mb-6">
              {t('cta.subtitle')}
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <span className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-sm text-wizard-text-secondary">
                ✓ {t('cta.trustBadge1')}
              </span>
              <span className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-sm text-wizard-text-secondary">
                ✓ {t('cta.trustBadge2')}
              </span>
              <span className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-sm text-wizard-text-secondary">
                ✓ {t('cta.trustBadge3')}
              </span>
            </div>

            <GlassButton
              variant="wizard"
              size="lg"
              onClick={() => navigate('/pricing')}
            >
              {t('cta.button')}
            </GlassButton>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
