import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon, GlassButton } from '@olorin/shared';
import { UserCheck, Fingerprint, ArrowRight, Scan, FileCheck } from 'lucide-react';

const IdentityVerificationPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="identity-verification-page">
      <HeroSection
        title={t('identityVerification.hero.title')}
        titleHighlight={t('identityVerification.hero.titleHighlight')}
        subtitle={t('identityVerification.hero.subtitle')}
        icon={<UserCheck className="w-24 h-24" />}
        backgroundPattern="circuit"
        primaryCTA={{ text: t('identityVerification.hero.cta'), onClick: () => navigate('/contact') }}
        secondaryCTA={{ text: t('identityVerification.hero.secondaryCta'), onClick: () => navigate('/demo') }}
      />

      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('identityVerification.methods.title')}
            </h2>
          </div>

          <div className="wizard-grid-3">
            {['document', 'biometric', 'liveness'].map((method) => (
              <GlassCard key={method} className="p-8 text-center">
                <GlowingIcon
                  icon={method === 'document' ? <FileCheck className="w-12 h-12" /> :
                        method === 'biometric' ? <Fingerprint className="w-12 h-12" /> :
                        <Scan className="w-12 h-12" />}
                  color="fraud"
                  size="xl"
                  animate
                />
                <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                  {t(`identityVerification.methods.${method}.title`)}
                </h3>
                <p className="text-wizard-text-secondary">
                  {t(`identityVerification.methods.${method}.description`)}
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
              {t('identityVerification.cta.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary mb-8">
              {t('identityVerification.cta.description')}
            </p>
            <GlassButton variant="wizard" size="lg" onClick={() => navigate('/contact')}>
              {t('identityVerification.cta.button')} <ArrowRight className="w-5 h-5 ml-2 inline" />
            </GlassButton>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default IdentityVerificationPage;
