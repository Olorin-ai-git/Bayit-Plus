import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon, GlassButton } from '@olorin/shared';
import { Code, Zap, Lock, ArrowRight, Terminal, Book, Cpu } from 'lucide-react';

const APIDocumentationPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="api-documentation-page">
      <HeroSection
        title={t('apiDocumentation.hero.title')}
        titleHighlight={t('apiDocumentation.hero.titleHighlight')}
        subtitle={t('apiDocumentation.hero.subtitle')}
        icon={<Code className="w-24 h-24" />}
        backgroundPattern="circuit"
        primaryCTA={{ text: t('apiDocumentation.hero.cta'), onClick: () => navigate('/contact') }}
        secondaryCTA={{ text: t('apiDocumentation.hero.secondaryCta'), onClick: () => window.open('https://docs.olorin.ai', '_blank') }}
      />

      {/* API Features */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('apiDocumentation.features.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary max-w-3xl mx-auto">
              {t('apiDocumentation.features.subtitle')}
            </p>
          </div>

          <div className="wizard-grid-3">
            <GlassCard className="p-8 text-center">
              <GlowingIcon icon={<Zap className="w-12 h-12" />} color="fraud" size="xl" animate />
              <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                {t('apiDocumentation.features.rest.title')}
              </h3>
              <p className="text-wizard-text-secondary">
                {t('apiDocumentation.features.rest.description')}
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center">
              <GlowingIcon icon={<Lock className="w-12 h-12" />} color="fraud" size="xl" animate />
              <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                {t('apiDocumentation.features.security.title')}
              </h3>
              <p className="text-wizard-text-secondary">
                {t('apiDocumentation.features.security.description')}
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center">
              <GlowingIcon icon={<Cpu className="w-12 h-12" />} color="fraud" size="xl" animate />
              <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                {t('apiDocumentation.features.realtime.title')}
              </h3>
              <p className="text-wizard-text-secondary">
                {t('apiDocumentation.features.realtime.description')}
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('apiDocumentation.examples.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <GlassCard className="p-8">
              <h3 className="text-xl font-bold text-wizard-text-primary mb-4 flex items-center">
                <Terminal className="w-6 h-6 mr-2 text-wizard-accent-purple" />
                {t('apiDocumentation.examples.analyze.title')}
              </h3>
              <div className="bg-wizard-bg-primary p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre className="text-wizard-text-secondary">
                  <code>{t('apiDocumentation.examples.analyze.code')}</code>
                </pre>
              </div>
            </GlassCard>

            <GlassCard className="p-8">
              <h3 className="text-xl font-bold text-wizard-text-primary mb-4 flex items-center">
                <Terminal className="w-6 h-6 mr-2 text-wizard-accent-purple" />
                {t('apiDocumentation.examples.webhook.title')}
              </h3>
              <div className="bg-wizard-bg-primary p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre className="text-wizard-text-secondary">
                  <code>{t('apiDocumentation.examples.webhook.code')}</code>
                </pre>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* SDKs & Libraries */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('apiDocumentation.sdks.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary">
              {t('apiDocumentation.sdks.subtitle')}
            </p>
          </div>

          <div className="wizard-grid-4 max-w-5xl mx-auto">
            {['python', 'javascript', 'java', 'go'].map((lang) => (
              <GlassCard key={lang} variant="interactive" className="p-6 text-center">
                <Book className="w-10 h-10 text-wizard-accent-purple mx-auto mb-4" />
                <h3 className="font-bold text-wizard-text-primary mb-2">
                  {t(`apiDocumentation.sdks.${lang}.name`)}
                </h3>
                <p className="text-sm text-wizard-text-secondary">
                  {t(`apiDocumentation.sdks.${lang}.description`)}
                </p>
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
              {t('apiDocumentation.cta.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary mb-8 max-w-2xl mx-auto">
              {t('apiDocumentation.cta.description')}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <GlassButton variant="wizard" size="lg" onClick={() => navigate('/contact')}>
                {t('apiDocumentation.cta.primary')} <ArrowRight className="w-5 h-5 ml-2 inline" />
              </GlassButton>
              <GlassButton variant="outline" size="lg" onClick={() => window.open('https://docs.olorin.ai', '_blank')}>
                {t('apiDocumentation.cta.secondary')}
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default APIDocumentationPage;
