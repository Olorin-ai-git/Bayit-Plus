import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon, GlassButton } from '@olorin/shared';
import { DollarSign, Activity, TrendingUp, Shield, CheckCircle, ArrowRight, BarChart3, Clock, AlertTriangle } from 'lucide-react';

const TransactionMonitoringPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="transaction-monitoring-page">
      <HeroSection
        title={t('transactionMonitoring.hero.title')}
        titleHighlight={t('transactionMonitoring.hero.titleHighlight')}
        subtitle={t('transactionMonitoring.hero.subtitle')}
        icon={<DollarSign className="w-24 h-24" />}
        backgroundPattern="circuit"
        primaryCTA={{ text: t('transactionMonitoring.hero.cta'), onClick: () => navigate('/contact') }}
        secondaryCTA={{ text: t('transactionMonitoring.hero.secondaryCta'), onClick: () => navigate('/demo') }}
      />

      {/* Key Capabilities */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('transactionMonitoring.capabilities.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary max-w-3xl mx-auto">
              {t('transactionMonitoring.capabilities.subtitle')}
            </p>
          </div>

          <div className="wizard-grid-3">
            <GlassCard className="p-8">
              <GlowingIcon icon={<Activity className="w-12 h-12" />} color="fraud" size="xl" animate />
              <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                {t('transactionMonitoring.capabilities.realTime.title')}
              </h3>
              <p className="text-wizard-text-secondary">
                {t('transactionMonitoring.capabilities.realTime.description')}
              </p>
            </GlassCard>

            <GlassCard className="p-8">
              <GlowingIcon icon={<TrendingUp className="w-12 h-12" />} color="fraud" size="xl" animate />
              <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                {t('transactionMonitoring.capabilities.velocity.title')}
              </h3>
              <p className="text-wizard-text-secondary">
                {t('transactionMonitoring.capabilities.velocity.description')}
              </p>
            </GlassCard>

            <GlassCard className="p-8">
              <GlowingIcon icon={<BarChart3 className="w-12 h-12" />} color="fraud" size="xl" animate />
              <h3 className="text-xl font-bold text-wizard-text-primary mt-6 mb-4">
                {t('transactionMonitoring.capabilities.patterns.title')}
              </h3>
              <p className="text-wizard-text-secondary">
                {t('transactionMonitoring.capabilities.patterns.description')}
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('transactionMonitoring.useCases.title')}
            </h2>
          </div>

          <div className="space-y-8 max-w-4xl mx-auto">
            <GlassCard variant="interactive" className="p-8">
              <div className="flex items-start space-x-6">
                <GlowingIcon icon={<DollarSign className="w-10 h-10" />} color="fraud" size="lg" />
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-wizard-text-primary mb-3">
                    {t('transactionMonitoring.useCases.ecommerce.title')}
                  </h3>
                  <p className="text-wizard-text-secondary mb-4">
                    {t('transactionMonitoring.useCases.ecommerce.description')}
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-wizard-text-primary">{t('transactionMonitoring.useCases.ecommerce.benefit1')}</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-wizard-text-primary">{t('transactionMonitoring.useCases.ecommerce.benefit2')}</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-wizard-text-primary">{t('transactionMonitoring.useCases.ecommerce.benefit3')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="interactive" className="p-8">
              <div className="flex items-start space-x-6">
                <GlowingIcon icon={<Shield className="w-10 h-10" />} color="fraud" size="lg" />
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-wizard-text-primary mb-3">
                    {t('transactionMonitoring.useCases.banking.title')}
                  </h3>
                  <p className="text-wizard-text-secondary mb-4">
                    {t('transactionMonitoring.useCases.banking.description')}
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-wizard-text-primary">{t('transactionMonitoring.useCases.banking.benefit1')}</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-wizard-text-primary">{t('transactionMonitoring.useCases.banking.benefit2')}</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-wizard-text-primary">{t('transactionMonitoring.useCases.banking.benefit3')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-wizard-text-primary mb-4">
              {t('transactionMonitoring.technical.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary max-w-3xl mx-auto">
              {t('transactionMonitoring.technical.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <GlassCard className="p-8">
              <Clock className="w-12 h-12 text-wizard-accent-purple mb-4" />
              <h3 className="text-xl font-bold text-wizard-text-primary mb-4">
                {t('transactionMonitoring.technical.speed.title')}
              </h3>
              <p className="text-wizard-text-secondary mb-4">
                {t('transactionMonitoring.technical.speed.description')}
              </p>
              <div className="bg-wizard-bg-deep p-4 rounded-lg">
                <code className="text-sm text-wizard-accent-purple">
                  {t('transactionMonitoring.technical.speed.metric')}
                </code>
              </div>
            </GlassCard>

            <GlassCard className="p-8">
              <AlertTriangle className="w-12 h-12 text-wizard-accent-purple mb-4" />
              <h3 className="text-xl font-bold text-wizard-text-primary mb-4">
                {t('transactionMonitoring.technical.accuracy.title')}
              </h3>
              <p className="text-wizard-text-secondary mb-4">
                {t('transactionMonitoring.technical.accuracy.description')}
              </p>
              <div className="bg-wizard-bg-deep p-4 rounded-lg">
                <code className="text-sm text-wizard-accent-purple">
                  {t('transactionMonitoring.technical.accuracy.metric')}
                </code>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <GlassCard variant="hero" className="p-12 text-center max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold wizard-text mb-6">
              {t('transactionMonitoring.cta.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary mb-8 max-w-2xl mx-auto">
              {t('transactionMonitoring.cta.description')}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <GlassButton variant="wizard" size="lg" onClick={() => navigate('/contact')}>
                {t('transactionMonitoring.cta.primary')} <ArrowRight className="w-5 h-5 ml-2 inline" />
              </GlassButton>
              <GlassButton variant="outline" size="lg" onClick={() => navigate('/roi')}>
                {t('transactionMonitoring.cta.secondary')}
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default TransactionMonitoringPage;
