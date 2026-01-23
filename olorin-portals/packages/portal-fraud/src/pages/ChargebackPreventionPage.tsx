import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon, GlassButton } from '@olorin/shared';
import { CreditCard, TrendingDown, Shield, ArrowRight, DollarSign } from 'lucide-react';

const ChargebackPreventionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="chargeback-prevention-page">
      <HeroSection
        title={t('chargebackPrevention.hero.title')}
        titleHighlight={t('chargebackPrevention.hero.titleHighlight')}
        subtitle={t('chargebackPrevention.hero.subtitle')}
        icon={<CreditCard className="w-24 h-24" />}
        backgroundPattern="circuit"
        primaryCTA={{ text: t('chargebackPrevention.hero.cta'), onClick: () => navigate('/contact') }}
        secondaryCTA={{ text: t('chargebackPrevention.hero.secondaryCta'), onClick: () => navigate('/demo') }}
      />

      {/* Key Benefits */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('chargebackPrevention.benefits.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary max-w-3xl mx-auto">
              {t('chargebackPrevention.benefits.subtitle')}
            </p>
          </div>

          <div className="wizard-grid-3">
            <GlassCard className="p-8 text-center">
              <GlowingIcon icon={<TrendingDown className="w-12 h-12" />} color="fraud" size="xl" animate />
              <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                {t('chargebackPrevention.benefits.reduce.title')}
              </h3>
              <p className="text-wizard-text-secondary">
                {t('chargebackPrevention.benefits.reduce.description')}
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center">
              <GlowingIcon icon={<Shield className="w-12 h-12" />} color="fraud" size="xl" animate />
              <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                {t('chargebackPrevention.benefits.protect.title')}
              </h3>
              <p className="text-wizard-text-secondary">
                {t('chargebackPrevention.benefits.protect.description')}
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center">
              <GlowingIcon icon={<DollarSign className="w-12 h-12" />} color="fraud" size="xl" animate />
              <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                {t('chargebackPrevention.benefits.revenue.title')}
              </h3>
              <p className="text-wizard-text-secondary">
                {t('chargebackPrevention.benefits.revenue.description')}
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('chargebackPrevention.howItWorks.title')}
            </h2>
          </div>

          <div className="space-y-8 max-w-4xl mx-auto">
            {[1, 2, 3, 4].map((step) => (
              <GlassCard key={step} className="p-8">
                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 rounded-full bg-wizard-accent-purple/20 border-2 border-wizard-accent-purple flex items-center justify-center font-bold text-wizard-accent-purple text-xl flex-shrink-0">
                    {step}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-wizard-text-primary mb-3">
                      {t(`chargebackPrevention.howItWorks.step${step}.title`)}
                    </h3>
                    <p className="text-wizard-text-secondary">
                      {t(`chargebackPrevention.howItWorks.step${step}.description`)}
                    </p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator Teaser */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <GlassCard variant="hero" className="p-12 max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold text-wizard-text-primary mb-6">
                  {t('chargebackPrevention.roi.title')}
                </h2>
                <p className="text-lg text-wizard-text-secondary mb-6">
                  {t('chargebackPrevention.roi.description')}
                </p>
                <GlassButton variant="wizard" size="lg" onClick={() => navigate('/roi')}>
                  {t('chargebackPrevention.roi.cta')} <ArrowRight className="w-5 h-5 ml-2 inline" />
                </GlassButton>
              </div>
              <div className="space-y-4">
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-wizard-text-secondary">{t('chargebackPrevention.roi.metric1Label')}</span>
                    <span className="text-3xl font-bold wizard-text">{t('chargebackPrevention.roi.metric1Value')}</span>
                  </div>
                </GlassCard>
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-wizard-text-secondary">{t('chargebackPrevention.roi.metric2Label')}</span>
                    <span className="text-3xl font-bold wizard-text">{t('chargebackPrevention.roi.metric2Value')}</span>
                  </div>
                </GlassCard>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* CTA */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <GlassCard variant="hero" className="p-12 text-center max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold wizard-text mb-6">
              {t('chargebackPrevention.cta.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary mb-8 max-w-2xl mx-auto">
              {t('chargebackPrevention.cta.description')}
            </p>
            <GlassButton variant="wizard" size="lg" onClick={() => navigate('/contact')}>
              {t('chargebackPrevention.cta.button')} <ArrowRight className="w-5 h-5 ml-2 inline" />
            </GlassButton>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default ChargebackPreventionPage;
