import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon, GlassButton } from '@olorin/shared';
import { CreditCard, ArrowRight, AlertTriangle } from 'lucide-react';

const PaymentFraudPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="payment-fraud-page">
      <HeroSection
        title={t('paymentFraud.hero.title')}
        titleHighlight={t('paymentFraud.hero.titleHighlight')}
        subtitle={t('paymentFraud.hero.subtitle')}
        icon={<CreditCard className="w-24 h-24" />}
        backgroundPattern="circuit"
        primaryCTA={{ text: t('paymentFraud.hero.cta'), onClick: () => navigate('/contact') }}
        secondaryCTA={{ text: t('paymentFraud.hero.secondaryCta'), onClick: () => navigate('/demo') }}
      />

      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('paymentFraud.threats.title')}
            </h2>
          </div>

          <div className="wizard-grid-3">
            {['cardTesting', 'stolenCards', 'synthetic'].map((threat) => (
              <GlassCard key={threat} className="p-8 text-center">
                <GlowingIcon icon={<AlertTriangle className="w-12 h-12" />} color="fraud" size="xl" animate />
                <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                  {t(`paymentFraud.threats.${threat}.title`)}
                </h3>
                <p className="text-wizard-text-secondary">
                  {t(`paymentFraud.threats.${threat}.description`)}
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
              {t('paymentFraud.cta.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary mb-8">
              {t('paymentFraud.cta.description')}
            </p>
            <GlassButton variant="wizard" size="lg" onClick={() => navigate('/contact')}>
              {t('paymentFraud.cta.button')} <ArrowRight className="w-5 h-5 ml-2 inline" />
            </GlassButton>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default PaymentFraudPage;
