import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon } from '@olorin/shared';
import {
  Mic,
  Calendar,
  Radio,
  BarChart3,
  Target,
  Database,
  RefreshCw,
  Volume2,
  Music,
  MessageCircle,
  Users
} from 'lucide-react';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = [
    {
      icon: <Calendar className="w-12 h-12" />,
      color: 'radio' as const,
      title: t('features.automation.title'),
      description: t('features.automation.description'),
    },
    {
      icon: <BarChart3 className="w-12 h-12" />,
      color: 'radio' as const,
      title: t('features.analytics.title'),
      description: t('features.analytics.description'),
    },
    {
      icon: <Target className="w-12 h-12" />,
      color: 'radio' as const,
      title: t('features.adInsertion.title'),
      description: t('features.adInsertion.description'),
    },
  ];

  const workflowSteps = [
    {
      icon: <Database className="w-10 h-10" />,
      color: 'radio' as const,
      title: t('workflow.step1.title'),
      description: t('workflow.step1.description'),
    },
    {
      icon: <RefreshCw className="w-10 h-10" />,
      color: 'radio' as const,
      title: t('workflow.step2.title'),
      description: t('workflow.step2.description'),
    },
    {
      icon: <Radio className="w-10 h-10" />,
      color: 'radio' as const,
      title: t('workflow.step3.title'),
      description: t('workflow.step3.description'),
    },
    {
      icon: <BarChart3 className="w-10 h-10" />,
      color: 'radio' as const,
      title: t('workflow.step4.title'),
      description: t('workflow.step4.description'),
    },
  ];

  const solutions = [
    {
      icon: <Volume2 className="w-10 h-10" />,
      name: t('solutions.commercial.title'),
      description: t('solutions.commercial.description')
    },
    {
      icon: <Music className="w-10 h-10" />,
      name: t('solutions.music.title'),
      description: t('solutions.music.description')
    },
    {
      icon: <MessageCircle className="w-10 h-10" />,
      name: t('solutions.talk.title'),
      description: t('solutions.talk.description')
    },
    {
      icon: <Users className="w-10 h-10" />,
      name: t('solutions.community.title'),
      description: t('solutions.community.description')
    },
  ];

  const metrics = [
    { value: t('metrics.retention'), label: 'Listener Retention' },
    { value: t('metrics.scheduling'), label: 'Manual Work' },
    { value: t('metrics.revenue'), label: 'Ad Revenue' },
    { value: t('metrics.engagement'), label: 'Engagement Boost' },
  ];

  return (
    <div className="radio-homepage">
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
        icon={<Mic className="w-32 h-32" />}
        backgroundPattern="particles"
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

      {/* Workflow Section */}
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
                  <div className="w-12 h-12 rounded-full bg-wizard-accent-radio/20 border-2 border-wizard-accent-radio flex items-center justify-center font-bold text-wizard-accent-radio text-xl">
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

      {/* Success Metrics Section */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="max-w-5xl mx-auto">
            <GlassCard variant="hero" className="p-12">
              <div className="text-center mb-8">
                <div className="mb-6 flex justify-center">
                  <GlowingIcon
                    icon={<Radio className="w-16 h-16" />}
                    color="radio"
                    size="xl"
                    animate
                  />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold wizard-text mb-4">
                  {t('metrics.title')}
                </h2>
                <p className="text-lg text-wizard-text-secondary max-w-2xl mx-auto">
                  {t('metrics.subtitle')}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                {metrics.map((metric, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl md:text-3xl font-bold wizard-text mb-2">
                      {metric.value}
                    </div>
                    <div className="text-wizard-text-secondary text-sm">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={() => navigate('/contact')}
                  className="wizard-button text-lg px-10 py-4"
                >
                  {t('cta.button')}
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4">
              {t('solutions.title')}
            </h2>
          </div>

          <div className="wizard-grid-4">
            {solutions.map((solution, index) => (
              <GlassCard
                key={solution.name}
                variant="interactive"
                className={`p-6 animate-fade-in-up animate-delay-${index + 1}00`}
              >
                <div className="mb-4 flex justify-center">
                  <GlowingIcon
                    icon={solution.icon}
                    color="radio"
                    size="lg"
                  />
                </div>
                <h3 className="text-lg font-bold wizard-text mb-3">
                  {solution.name}
                </h3>
                <p className="text-sm text-wizard-text-secondary">
                  {solution.description}
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
