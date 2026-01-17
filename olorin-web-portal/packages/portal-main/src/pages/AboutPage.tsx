import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GlassCard, GlowingIcon } from '@olorin/shared';
import { Target, Eye, Users, Cpu } from 'lucide-react';

const AboutPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Team members (placeholder - from mockup)
  const teamMembers = [
    { name: 'Emma Black', role: 'Founder & CEO', image: null },
    { name: 'John Smith', role: 'CTO', image: null },
    { name: 'Judy Smith', role: 'Head of AI Research', image: null },
    { name: 'Jane Smith', role: 'VP of Engineering', image: null },
  ];

  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="wizard-gradient-bg wizard-particles py-20 md:py-32">
        <div className="wizard-container">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-wizard-text-primary mb-6 animate-fade-in-up">
              {t('about.title')}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-wizard-text-secondary animate-fade-in-up animate-delay-100">
              Pioneering the future of agentic AI across industries
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="wizard-grid-2 gap-12">
            <GlassCard className="p-10 text-center">
              <div className="mb-6 flex justify-center">
                <GlowingIcon
                  icon={<Target className="w-12 h-12" />}
                  color="purple"
                  size="lg"
                />
              </div>
              <h2 className="text-3xl font-bold wizard-text mb-6">
                {t('about.mission.title')}
              </h2>
              <p className="text-wizard-text-secondary text-lg leading-relaxed">
                {t('about.mission.content')}
              </p>
            </GlassCard>

            <GlassCard className="p-10 text-center">
              <div className="mb-6 flex justify-center">
                <GlowingIcon
                  icon={<Eye className="w-12 h-12" />}
                  color="pink"
                  size="lg"
                />
              </div>
              <h2 className="text-3xl font-bold wizard-text mb-6">
                {t('about.vision.title')}
              </h2>
              <p className="text-wizard-text-secondary text-lg leading-relaxed">
                {t('about.vision.content')}
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4">
              {t('about.team.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary">
              {t('about.team.subtitle')}
            </p>
          </div>

          <div className="wizard-grid-4">
            {teamMembers.map((member, index) => (
              <GlassCard
                key={member.name}
                className={`p-8 text-center animate-fade-in-up animate-delay-${index + 1}00`}
              >
                {/* Placeholder for team member photo */}
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-wizard-accent-purple/20 border-2 border-wizard-accent-purple flex items-center justify-center">
                  <Users className="w-12 h-12 text-wizard-accent-purple" />
                </div>
                <h3 className="text-xl font-bold text-wizard-text-primary mb-2">
                  {member.name}
                </h3>
                <p className="text-wizard-accent-purple text-sm">
                  {member.role}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8 flex justify-center">
              <GlowingIcon
                icon={<Cpu className="w-16 h-16" />}
                color="cyan"
                size="xl"
                animate
              />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-6">
              {t('about.technology.title')}
            </h2>
            <p className="text-lg text-wizard-text-secondary mb-8">
              {t('about.technology.subtitle')}
            </p>

            <GlassCard className="p-10 text-left">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold wizard-text mb-3">
                    Advanced Machine Learning
                  </h3>
                  <p className="text-wizard-text-secondary">
                    Our AI agents leverage state-of-the-art machine learning models,
                    including deep learning and transformer architectures, to deliver
                    unprecedented accuracy and performance.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-bold wizard-text mb-3">
                    Agentic AI Framework
                  </h3>
                  <p className="text-wizard-text-secondary">
                    Built on a robust agentic AI framework that enables autonomous
                    decision-making, multi-agent collaboration, and adaptive learning
                    across diverse domains.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-bold wizard-text mb-3">
                    Real-Time Processing
                  </h3>
                  <p className="text-wizard-text-secondary">
                    High-performance infrastructure ensures sub-second response times
                    for critical fraud detection, streaming optimization, and radio
                    management operations.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="wizard-section wizard-gradient-bg">
        <div className="wizard-container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-6">
              Join Us in Shaping the Future
            </h2>
            <p className="text-lg md:text-xl text-wizard-text-secondary mb-10">
              Discover how Olorin.AI can transform your business
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="wizard-button text-lg px-10 py-4"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
