import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon, GlassButton } from '@olorin/shared';
import { MapPin, Network, Fingerprint, User, Smartphone, Activity, Shield, CheckCircle, ArrowRight, Cpu } from 'lucide-react';

const AgentsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const agents = [
    {
      icon: <MapPin className="w-12 h-12" />,
      title: t('agentsPage.location.title'),
      subtitle: t('agentsPage.location.subtitle'),
      description: t('agentsPage.location.description'),
      capabilities: [
        t('agentsPage.location.cap1'),
        t('agentsPage.location.cap2'),
        t('agentsPage.location.cap3'),
        t('agentsPage.location.cap4'),
      ],
    },
    {
      icon: <Network className="w-12 h-12" />,
      title: t('agentsPage.network.title'),
      subtitle: t('agentsPage.network.subtitle'),
      description: t('agentsPage.network.description'),
      capabilities: [
        t('agentsPage.network.cap1'),
        t('agentsPage.network.cap2'),
        t('agentsPage.network.cap3'),
        t('agentsPage.network.cap4'),
      ],
    },
    {
      icon: <Fingerprint className="w-12 h-12" />,
      title: t('agentsPage.auth.title'),
      subtitle: t('agentsPage.auth.subtitle'),
      description: t('agentsPage.auth.description'),
      capabilities: [
        t('agentsPage.auth.cap1'),
        t('agentsPage.auth.cap2'),
        t('agentsPage.auth.cap3'),
        t('agentsPage.auth.cap4'),
      ],
    },
    {
      icon: <User className="w-12 h-12" />,
      title: t('agentsPage.behavioral.title'),
      subtitle: t('agentsPage.behavioral.subtitle'),
      description: t('agentsPage.behavioral.description'),
      capabilities: [
        t('agentsPage.behavioral.cap1'),
        t('agentsPage.behavioral.cap2'),
        t('agentsPage.behavioral.cap3'),
        t('agentsPage.behavioral.cap4'),
      ],
    },
    {
      icon: <Smartphone className="w-12 h-12" />,
      title: t('agentsPage.device.title'),
      subtitle: t('agentsPage.device.subtitle'),
      description: t('agentsPage.device.description'),
      capabilities: [
        t('agentsPage.device.cap1'),
        t('agentsPage.device.cap2'),
        t('agentsPage.device.cap3'),
        t('agentsPage.device.cap4'),
      ],
    },
    {
      icon: <Activity className="w-12 h-12" />,
      title: t('agentsPage.velocity.title'),
      subtitle: t('agentsPage.velocity.subtitle'),
      description: t('agentsPage.velocity.description'),
      capabilities: [
        t('agentsPage.velocity.cap1'),
        t('agentsPage.velocity.cap2'),
        t('agentsPage.velocity.cap3'),
        t('agentsPage.velocity.cap4'),
      ],
    },
  ];

  return (
    <div className="agents-page">
      <HeroSection
        title={t('agentsPage.title')}
        titleHighlight={t('agentsPage.titleHighlight')}
        subtitle={t('agentsPage.subtitle')}
        icon={<Cpu className="w-24 h-24" />}
        backgroundPattern="circuit"
        primaryCTA={{ text: t('agentsPage.ctaDemo'), onClick: () => navigate('/demo') }}
        secondaryCTA={{ text: t('agentsPage.ctaContact'), onClick: () => navigate('/contact') }}
      />

      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold wizard-text mb-4">{t('agentsPage.meetTitle')}</h2>
            <p className="text-lg text-wizard-text-secondary max-w-2xl mx-auto">{t('agentsPage.meetSubtitle')}</p>
          </div>

          <div className="space-y-8">
            {agents.map((agent, index) => (
              <GlassCard key={agent.title} variant="interactive" className="p-8">
                <div className={`grid md:grid-cols-2 gap-8 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                  <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                    <div className="flex items-center space-x-4 mb-4">
                      <GlowingIcon icon={agent.icon} color="fraud" size="xl" animate />
                      <div>
                        <h3 className="text-2xl font-bold text-wizard-text-primary">{agent.title}</h3>
                        <p className="text-wizard-accent-purple">{agent.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-wizard-text-secondary mb-6">{agent.description}</p>
                    <ul className="space-y-3">
                      {agent.capabilities.map((cap) => (
                        <li key={cap} className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                          <span className="text-wizard-text-primary">{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`aspect-square bg-wizard-bg-deep rounded-xl flex items-center justify-center border border-wizard-border-primary ${index % 2 === 1 ? 'md:order-1' : ''}`}>
                    <div className="text-center p-8">
                      <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-wizard-accent-fraud/10 flex items-center justify-center">
                        {agent.icon}
                      </div>
                      <p className="text-wizard-text-secondary text-sm">{t('agentsPage.agentVisualization')}</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <GlassCard variant="hero" className="p-12 text-center">
            <GlowingIcon icon={<Shield className="w-16 h-16" />} color="fraud" size="xl" animate />
            <h2 className="text-3xl md:text-4xl font-bold wizard-text mt-8 mb-4">{t('agentsPage.collaborationTitle')}</h2>
            <p className="text-lg text-wizard-text-secondary max-w-2xl mx-auto mb-8">{t('agentsPage.collaborationDescription')}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <GlassButton variant="wizard" size="lg" onClick={() => navigate('/demo')}>
                {t('agentsPage.seeInAction')} <ArrowRight className="w-5 h-5 ml-2 inline" />
              </GlassButton>
              <GlassButton variant="outline" size="lg" onClick={() => navigate('/features')}>
                {t('agentsPage.exploreFeatures')}
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default AgentsPage;
