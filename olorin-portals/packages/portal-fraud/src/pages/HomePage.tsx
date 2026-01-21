import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon } from '@olorin/shared';
import {
  Shield,
  MapPin,
  Network,
  Fingerprint,
  User,
  Database,
  RefreshCw,
  AlertTriangle,
  Gauge,
  Bell,
  CheckCircle,
  TrendingDown
} from 'lucide-react';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const agents = [
    {
      icon: <MapPin className="w-12 h-12" />,
      color: 'fraud' as const,
      title: t('agents.location.title'),
      description: t('agents.location.description'),
    },
    {
      icon: <Network className="w-12 h-12" />,
      color: 'fraud' as const,
      title: t('agents.network.title'),
      description: t('agents.network.description'),
    },
    {
      icon: <Fingerprint className="w-12 h-12" />,
      color: 'fraud' as const,
      title: t('agents.authentication.title'),
      description: t('agents.authentication.description'),
    },
    {
      icon: <User className="w-12 h-12" />,
      color: 'fraud' as const,
      title: t('agents.behavioral.title'),
      description: t('agents.behavioral.description'),
    },
  ];

  const workflowSteps = [
    {
      icon: <Database className="w-10 h-10" />,
      color: 'fraud' as const,
      title: t('workflow.step1.title'),
      description: t('workflow.step1.description'),
    },
    {
      icon: <RefreshCw className="w-10 h-10" />,
      color: 'fraud' as const,
      title: t('workflow.step2.title'),
      description: t('workflow.step2.description'),
    },
    {
      icon: <AlertTriangle className="w-10 h-10" />,
      color: 'fraud' as const,
      title: t('workflow.step3.title'),
      description: t('workflow.step3.description'),
    },
    {
      icon: <Gauge className="w-10 h-10" />,
      color: 'fraud' as const,
      title: t('workflow.step4.title'),
      description: t('workflow.step4.description'),
    },
  ];

  const features = [
    {
      icon: <Shield className="w-10 h-10" />,
      title: t('features.realTime.title'),
      description: t('features.realTime.description'),
    },
    {
      icon: <Bell className="w-10 h-10" />,
      title: t('features.instantAlert.title'),
      description: t('features.instantAlert.description'),
    },
    {
      icon: <CheckCircle className="w-10 h-10" />,
      title: t('features.predictive.title'),
      description: t('features.predictive.description'),
    },
  ];

  const industries = [
    { name: t('useCases.financial.title'), description: t('useCases.financial.description') },
    { name: t('useCases.ecommerce.title'), description: t('useCases.ecommerce.description') },
    { name: t('useCases.insurance.title'), description: t('useCases.insurance.description') },
    { name: t('useCases.healthcare.title'), description: t('useCases.healthcare.description') },
  ];

  return (
    <div className="fraud-homepage">
      {/* Hero Section */}
      <HeroSection
        title={t('hero.title')}
        titleHighlight={t('hero.titleHighlight')}
        subtitle={t('hero.description')}
        primaryCTA={{
          text: t('hero.ctaExplore'),
          onClick: () => {
            document.getElementById('agents')?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        secondaryCTA={{
          text: t('hero.ctaDemo'),
          onClick: () => navigate('/contact')
        }}
        icon={<Shield className="w-32 h-32" />}
        backgroundPattern="circuit"
      />

      {/* How Our Agents Explore Section */}
      <section id="agents" className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4 wizard-text">
              {t('agents.sectionTitle')}
            </h2>
            <p className="text-lg md:text-xl text-wizard-text-secondary max-w-3xl mx-auto">
              {t('agents.sectionSubtitle')}
            </p>
          </div>

          <div className="wizard-grid-4">
            {agents.map((agent, index) => (
              <GlassCard
                key={agent.title}
                variant="interactive"
                className={`p-8 text-center animate-fade-in-up animate-delay-${index + 1}00`}
              >
                <div className="mb-6 flex justify-center">
                  <GlowingIcon
                    icon={agent.icon}
                    color={agent.color}
                    size="xl"
                    animate
                  />
                </div>
                <h3 className="text-xl font-bold text-wizard-text-primary mb-3">
                  {agent.title}
                </h3>
                <p className="text-wizard-text-secondary">
                  {agent.description}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Intelligent Agent Workflow Section */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4 wizard-text">
              {t('workflow.sectionTitle')}
            </h2>
            <p className="text-lg md:text-xl text-wizard-text-secondary max-w-3xl mx-auto">
              {t('workflow.sectionSubtitle')}
            </p>
          </div>

          <div className="wizard-grid-4">
            {workflowSteps.map((step, index) => (
              <GlassCard
                key={step.title}
                className={`p-6 animate-fade-in-up animate-delay-${index + 1}00`}
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-wizard-accent-purple/20 border-2 border-wizard-accent-purple flex items-center justify-center font-bold text-wizard-accent-purple text-xl">
                    {index + 1}
                  </div>
                  <GlowingIcon
                    icon={step.icon}
                    color={step.color}
                    size="md"
                  />
                </div>
                <h3 className="text-xl font-bold text-wizard-text-primary mb-3">
                  {step.title}
                </h3>
                <p className="text-wizard-text-secondary">
                  {step.description}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Success Story Section */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="max-w-5xl mx-auto">
            <GlassCard variant="hero" className="p-12">
              <div className="text-center mb-8">
                <div className="mb-6 flex justify-center">
                  <GlowingIcon
                    icon={<TrendingDown className="w-16 h-16" />}
                    color="fraud"
                    size="xl"
                    animate
                  />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold wizard-text mb-4">
                  {t('successStory.title')}
                </h2>
                <p className="text-lg text-wizard-text-secondary max-w-2xl mx-auto">
                  {t('successStory.subtitle')}
                </p>
              </div>

              {/* Success Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                <div className="text-center">
                  <div className="text-4xl font-bold wizard-text mb-2">
                    {t('successStory.metric1')}
                  </div>
                  <div className="text-wizard-text-secondary text-sm">
                    In Fraud Losses
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold wizard-text mb-2">
                    {t('successStory.metric2')}
                  </div>
                  <div className="text-wizard-text-secondary text-sm">
                    Detection Rate
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold wizard-text mb-2">
                    {t('successStory.metric3')}
                  </div>
                  <div className="text-wizard-text-secondary text-sm">
                    Average Response
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold wizard-text mb-2">
                    {t('successStory.metric4')}
                  </div>
                  <div className="text-wizard-text-secondary text-sm">
                    Operational Costs
                  </div>
                </div>
              </div>

              <p className="text-center text-wizard-text-secondary mb-8 max-w-3xl mx-auto">
                {t('successStory.description')}
              </p>

              <div className="text-center">
                <button
                  onClick={() => navigate('/contact')}
                  className="wizard-button text-lg px-10 py-4"
                >
                  {t('successStory.cta')}
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4">
              {t('features.sectionTitle')}
            </h2>
          </div>

          <div className="wizard-grid-3">
            {features.map((feature, index) => (
              <GlassCard
                key={feature.title}
                className={`p-8 text-center animate-fade-in-up animate-delay-${index + 1}00`}
              >
                <div className="mb-6 flex justify-center">
                  <GlowingIcon
                    icon={feature.icon}
                    color="fraud"
                    size="lg"
                  />
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

      {/* Industries Section */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4">
              {t('useCases.title')}
            </h2>
          </div>

          <div className="wizard-grid-4">
            {industries.map((industry, index) => (
              <GlassCard
                key={industry.name}
                variant="interactive"
                className={`p-6 animate-fade-in-up animate-delay-${index + 1}00`}
              >
                <h3 className="text-lg font-bold wizard-text mb-3">
                  {industry.name}
                </h3>
                <p className="text-sm text-wizard-text-secondary">
                  {industry.description}
                </p>
              </GlassCard>
            ))}
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
