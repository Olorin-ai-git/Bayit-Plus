import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon, GlassButton } from '@olorin/shared';
import { FileText, Award, ArrowRight, FileCheck, Lock } from 'lucide-react';

const CompliancePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="compliance-page">
      <HeroSection
        title={t('compliance.hero.title')}
        titleHighlight={t('compliance.hero.titleHighlight')}
        subtitle={t('compliance.hero.subtitle')}
        icon={<FileText className="w-24 h-24" />}
        backgroundPattern="circuit"
        primaryCTA={{ text: t('compliance.hero.cta'), onClick: () => navigate('/contact') }}
        secondaryCTA={{ text: t('compliance.hero.secondaryCta'), onClick: () => navigate('/demo') }}
      />

      {/* Compliance Standards */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('compliance.standards.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {['pci', 'gdpr', 'soc2', 'iso'].map((standard) => (
              <GlassCard key={standard} className="p-6 text-center">
                <GlowingIcon icon={<Award className="w-10 h-10" />} color="fraud" size="lg" />
                <h3 className="font-bold text-wizard-text-primary mt-4 mb-2">
                  {t(`compliance.standards.${standard}.title`)}
                </h3>
                <p className="text-sm text-wizard-text-secondary">
                  {t(`compliance.standards.${standard}.description`)}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Reporting Features */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('compliance.reporting.title')}
            </h2>
          </div>

          <div className="wizard-grid-3">
            {['automated', 'customizable', 'audit'].map((feature) => (
              <GlassCard key={feature} className="p-8 text-center">
                <GlowingIcon
                  icon={feature === 'automated' ? <FileCheck className="w-12 h-12" /> :
                        feature === 'customizable' ? <FileText className="w-12 h-12" /> :
                        <Lock className="w-12 h-12" />}
                  color="fraud"
                  size="xl"
                  animate
                />
                <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                  {t(`compliance.reporting.${feature}.title`)}
                </h3>
                <p className="text-wizard-text-secondary">
                  {t(`compliance.reporting.${feature}.description`)}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Documentation */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('compliance.documentation.title')}
            </h2>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {['dpa', 'baa', 'privacy', 'security'].map((doc) => (
              <GlassCard key={doc} variant="interactive" className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <FileText className="w-8 h-8 text-wizard-accent-purple" />
                    <div>
                      <h3 className="font-bold text-wizard-text-primary">
                        {t(`compliance.documentation.${doc}.title`)}
                      </h3>
                      <p className="text-sm text-wizard-text-secondary">
                        {t(`compliance.documentation.${doc}.description`)}
                      </p>
                    </div>
                  </div>
                  <GlassButton variant="outline" size="sm" onClick={() => navigate('/contact')}>
                    {t('compliance.documentation.download')}
                  </GlassButton>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <GlassCard variant="hero" className="p-12 text-center max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold wizard-text mb-6">
              {t('compliance.cta.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary mb-8">
              {t('compliance.cta.description')}
            </p>
            <GlassButton variant="wizard" size="lg" onClick={() => navigate('/contact')}>
              {t('compliance.cta.button')} <ArrowRight className="w-5 h-5 ml-2 inline" />
            </GlassButton>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default CompliancePage;
