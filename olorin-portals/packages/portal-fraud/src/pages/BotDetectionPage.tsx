import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon, GlassButton } from '@olorin/shared';
import { Bot, Activity, ArrowRight, Zap, Network } from 'lucide-react';

const BotDetectionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="bot-detection-page">
      <HeroSection
        title={t('botDetection.hero.title')}
        titleHighlight={t('botDetection.hero.titleHighlight')}
        subtitle={t('botDetection.hero.subtitle')}
        icon={<Bot className="w-24 h-24" />}
        backgroundPattern="circuit"
        primaryCTA={{ text: t('botDetection.hero.cta'), onClick: () => navigate('/contact') }}
        secondaryCTA={{ text: t('botDetection.hero.secondaryCta'), onClick: () => navigate('/demo') }}
      />

      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('botDetection.capabilities.title')}
            </h2>
          </div>

          <div className="wizard-grid-3">
            {['behavioral', 'network', 'realtime'].map((capability) => (
              <GlassCard key={capability} className="p-8 text-center">
                <GlowingIcon
                  icon={capability === 'behavioral' ? <Activity className="w-12 h-12" /> :
                        capability === 'network' ? <Network className="w-12 h-12" /> :
                        <Zap className="w-12 h-12" />}
                  color="fraud"
                  size="xl"
                  animate
                />
                <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                  {t(`botDetection.capabilities.${capability}.title`)}
                </h3>
                <p className="text-wizard-text-secondary">
                  {t(`botDetection.capabilities.${capability}.description`)}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <GlassCard variant="hero" className="p-12 text-center max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold wizard-text mb-6">
              {t('botDetection.cta.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary mb-8">
              {t('botDetection.cta.description')}
            </p>
            <GlassButton variant="wizard" size="lg" onClick={() => navigate('/contact')}>
              {t('botDetection.cta.button')} <ArrowRight className="w-5 h-5 ml-2 inline" />
            </GlassButton>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default BotDetectionPage;
