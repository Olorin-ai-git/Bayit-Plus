import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon, GlassButton } from '@olorin/shared';
import { Lock, Fingerprint, CheckCircle, ArrowRight, ShieldAlert, Activity } from 'lucide-react';

const AccountTakeoverPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="account-takeover-page">
      <HeroSection
        title={t('accountTakeover.hero.title')}
        titleHighlight={t('accountTakeover.hero.titleHighlight')}
        subtitle={t('accountTakeover.hero.subtitle')}
        icon={<Lock className="w-24 h-24" />}
        backgroundPattern="circuit"
        primaryCTA={{ text: t('accountTakeover.hero.cta'), onClick: () => navigate('/contact') }}
        secondaryCTA={{ text: t('accountTakeover.hero.secondaryCta'), onClick: () => navigate('/demo') }}
      />

      {/* Detection Methods */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('accountTakeover.detection.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary max-w-3xl mx-auto">
              {t('accountTakeover.detection.subtitle')}
            </p>
          </div>

          <div className="wizard-grid-3">
            <GlassCard className="p-8 text-center">
              <GlowingIcon icon={<Fingerprint className="w-12 h-12" />} color="fraud" size="xl" animate />
              <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                {t('accountTakeover.detection.biometrics.title')}
              </h3>
              <p className="text-wizard-text-secondary">
                {t('accountTakeover.detection.biometrics.description')}
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center">
              <GlowingIcon icon={<Activity className="w-12 h-12" />} color="fraud" size="xl" animate />
              <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                {t('accountTakeover.detection.behavioral.title')}
              </h3>
              <p className="text-wizard-text-secondary">
                {t('accountTakeover.detection.behavioral.description')}
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center">
              <GlowingIcon icon={<ShieldAlert className="w-12 h-12" />} color="fraud" size="xl" animate />
              <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                {t('accountTakeover.detection.anomaly.title')}
              </h3>
              <p className="text-wizard-text-secondary">
                {t('accountTakeover.detection.anomaly.description')}
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Prevention Strategies */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('accountTakeover.prevention.title')}
            </h2>
          </div>

          <div className="space-y-6 max-w-4xl mx-auto">
            {[1, 2, 3, 4, 5].map((item) => (
              <GlassCard key={item} className="p-6">
                <div className="flex items-start space-x-4">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-wizard-text-primary mb-2">
                      {t(`accountTakeover.prevention.item${item}.title`)}
                    </h3>
                    <p className="text-wizard-text-secondary">
                      {t(`accountTakeover.prevention.item${item}.description`)}
                    </p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <GlassCard variant="hero" className="p-12 text-center max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold wizard-text mb-6">
              {t('accountTakeover.cta.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary mb-8 max-w-2xl mx-auto">
              {t('accountTakeover.cta.description')}
            </p>
            <GlassButton variant="wizard" size="lg" onClick={() => navigate('/contact')}>
              {t('accountTakeover.cta.button')} <ArrowRight className="w-5 h-5 ml-2 inline" />
            </GlassButton>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default AccountTakeoverPage;
