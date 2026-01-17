import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon } from '@olorin/shared';
import {
  TrendingUp,
  Brain,
  Target,
  Database,
  Zap,
  BarChart,
  Clock,
  Shield,
  AlertCircle,
  LineChart,
  Activity
} from 'lucide-react';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = [
    {
      icon: <Brain className="w-12 h-12" />,
      color: 'omen' as const,
      title: t('features.aiPredictions.title'),
      description: t('features.aiPredictions.description'),
    },
    {
      icon: <TrendingUp className="w-12 h-12" />,
      color: 'omen' as const,
      title: t('features.forecasting.title'),
      description: t('features.forecasting.description'),
    },
    {
      icon: <Target className="w-12 h-12" />,
      color: 'omen' as const,
      title: t('features.insights.title'),
      description: t('features.insights.description'),
    },
  ];

  const workflowSteps = [
    {
      icon: <Database className="w-10 h-10" />,
      color: 'omen' as const,
      title: t('workflow.step1.title'),
      description: t('workflow.step1.description'),
    },
    {
      icon: <Brain className="w-10 h-10" />,
      color: 'omen' as const,
      title: t('workflow.step2.title'),
      description: t('workflow.step2.description'),
    },
    {
      icon: <Zap className="w-10 h-10" />,
      color: 'omen' as const,
      title: t('workflow.step3.title'),
      description: t('workflow.step3.description'),
    },
    {
      icon: <BarChart className="w-10 h-10" />,
      color: 'omen' as const,
      title: t('workflow.step4.title'),
      description: t('workflow.step4.description'),
    },
  ];

  const capabilities = [
    {
      icon: <Clock className="w-10 h-10" />,
      name: t('capabilities.realTime.title'),
      description: t('capabilities.realTime.description')
    },
    {
      icon: <Shield className="w-10 h-10" />,
      name: t('capabilities.riskAssessment.title'),
      description: t('capabilities.riskAssessment.description')
    },
    {
      icon: <AlertCircle className="w-10 h-10" />,
      name: t('capabilities.earlyWarning.title'),
      description: t('capabilities.earlyWarning.description')
    },
    {
      icon: <LineChart className="w-10 h-10" />,
      name: t('capabilities.trendAnalysis.title'),
      description: t('capabilities.trendAnalysis.description')
    },
  ];

  const stats = [
    { value: t('stats.accuracy'), label: 'Prediction Accuracy' },
    { value: t('stats.speed'), label: 'Faster Insights' },
    { value: t('stats.coverage'), label: 'Data Coverage' },
    { value: t('stats.reduction'), label: 'Risk Reduction' },
  ];

  return (
    <div className="omen-homepage">
      {/* Hero Section */}
      <HeroSection
        title={t('hero.title')}
        titleHighlight={t('hero.titleHighlight')}
        subtitle={t('hero.description')}
        primaryCTA={{
          text: t('hero.ctaExplore'),
          onClick: () => {
            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        secondaryCTA={{
          text: t('hero.ctaDemo'),
          onClick: () => navigate('/contact')
        }}
        icon={<Activity className="w-32 h-32" />}
        backgroundPattern="circuit"
      />

      {/* Features Section */}
      <section id="features" className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4 wizard-text">
              {t('features.sectionTitle')}
            </h2>
          </div>

          <div className="wizard-grid-3">
            {features.map((feature, index) => (
              <GlassCard
                key={feature.title}
                variant="interactive"
                className={`p-8 text-center animate-fade-in-up animate-delay-${index + 1}00`}
              >
                <div className="mb-6 flex justify-center">
                  <GlowingIcon
                    icon={feature.icon}
                    color={feature.color}
                    size="xl"
                    animate
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

      {/* How It Works Section */}
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
                  <div className="w-12 h-12 rounded-full bg-wizard-accent-omen/20 border-2 border-wizard-accent-omen flex items-center justify-center font-bold text-wizard-accent-omen text-xl">
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

      {/* Stats Section */}
      <section className="wizard-section bg-wizard-bg-primary">
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

      {/* Capabilities Section */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4">
              {t('capabilities.title')}
            </h2>
          </div>

          <div className="wizard-grid-4">
            {capabilities.map((capability, index) => (
              <GlassCard
                key={capability.name}
                variant="interactive"
                className={`p-6 animate-fade-in-up animate-delay-${index + 1}00`}
              >
                <div className="mb-4 flex justify-center">
                  <GlowingIcon
                    icon={capability.icon}
                    color="omen"
                    size="lg"
                  />
                </div>
                <h3 className="text-lg font-bold wizard-text mb-3">
                  {capability.name}
                </h3>
                <p className="text-sm text-wizard-text-secondary">
                  {capability.description}
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
