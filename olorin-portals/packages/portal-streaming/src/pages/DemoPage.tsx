/**
 * DemoPage - Bayit Plus Product Demos
 * Shows product overview, AI assistant, voice search, and platform availability
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PlatformGrid, GlassButton } from '@olorin/shared';
import { Play } from 'lucide-react';

interface DemoSection {
  title: string;
  description: string;
  features: string[];
  reversed?: boolean;
}

const DemoPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sections: DemoSection[] = [
    {
      title: String(t('demoPage.sections.overview.title')),
      description: String(t('demoPage.sections.overview.description')),
      features: [
        String(t('demoPage.sections.overview.f1')),
        String(t('demoPage.sections.overview.f2')),
        String(t('demoPage.sections.overview.f3')),
        String(t('demoPage.sections.overview.f4')),
      ],
    },
    {
      title: String(t('demoPage.sections.ai.title')),
      description: String(t('demoPage.sections.ai.description')),
      features: [
        String(t('demoPage.sections.ai.f1')),
        String(t('demoPage.sections.ai.f2')),
        String(t('demoPage.sections.ai.f3')),
        String(t('demoPage.sections.ai.f4')),
      ],
      reversed: true,
    },
    {
      title: String(t('demoPage.sections.voice.title')),
      description: String(t('demoPage.sections.voice.description')),
      features: [
        String(t('demoPage.sections.voice.f1')),
        String(t('demoPage.sections.voice.f2')),
        String(t('demoPage.sections.voice.f3')),
        String(t('demoPage.sections.voice.f4')),
      ],
    },
  ];

  return (
    <div className="demo-page">
      {/* Hero Section */}
      <section className="wizard-section wizard-gradient-bg">
        <div className="wizard-container text-center">
          <div className="mb-8 flex justify-center">
            <Play className="w-24 h-24 text-wizard-accent-purple" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-wizard-text-primary mb-6">
            {t('demoPage.title')}{' '}
            <span className="wizard-text">{t('demoPage.titleHighlight')}</span>
          </h1>
          <p className="text-lg md:text-xl text-wizard-text-secondary max-w-3xl mx-auto mb-10">
            {t('demoPage.subtitle')}
          </p>
          <GlassButton
            variant="wizard"
            size="lg"
            onClick={() => navigate('/pricing')}
          >
            {t('demoPage.scheduleCta')}
          </GlassButton>
        </div>
      </section>

      {/* Demo Sections */}
      {sections.map((section, index) => (
        <section
          key={section.title}
          className={`wizard-section ${
            index % 2 === 0 ? 'bg-wizard-bg-primary' : 'bg-wizard-bg-deep'
          }`}
        >
          <div className="wizard-container">
            <div className={`grid md:grid-cols-2 gap-12 items-center ${section.reversed ? 'md:flex-row-reverse' : ''}`}>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-wizard-text-primary mb-4">
                  {section.title}
                </h2>
                <p className="text-lg text-wizard-text-secondary mb-6">
                  {section.description}
                </p>
                <ul className="space-y-3">
                  {section.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-wizard-text-secondary">
                      <span className="text-wizard-accent-purple mt-1">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 h-64 flex items-center justify-center bg-gradient-to-br from-wizard-accent-purple/20 to-transparent">
                <Play className="w-16 h-16 text-wizard-accent-purple opacity-60" />
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Platforms Section */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4">
              {t('demoPage.platformsTitle')}
            </h2>
          </div>
          <PlatformGrid
            platforms={['ios', 'android', 'tvos', 'web', 'webos', 'tizen']}
            size="md"
            columns={6}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="wizard-section wizard-gradient-bg wizard-particles">
        <div className="wizard-container text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-6">
            {t('demoPage.ctaTitle')}
          </h2>
          <p className="text-lg md:text-xl text-wizard-text-secondary mb-10 max-w-3xl mx-auto">
            {t('demoPage.ctaSubtitle')}
          </p>
          <button
            onClick={() => navigate('/pricing')}
            className="wizard-button text-lg px-10 py-4"
          >
            {t('demoPage.ctaButton')}
          </button>
        </div>
      </section>
    </div>
  );
};

export default DemoPage;
