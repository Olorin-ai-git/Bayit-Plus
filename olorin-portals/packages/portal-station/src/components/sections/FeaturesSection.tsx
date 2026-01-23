import React from 'react';
import { TFunction } from 'i18next';
import { GlassCard, GlowingIcon } from '@olorin/shared';

interface Feature {
  icon: React.ReactNode;
  color: 'radio';
  title: string;
  description: string;
}

interface Props {
  features: Feature[];
  t: TFunction;
}

export const FeaturesSection: React.FC<Props> = ({ features, t }) => (
  <section
    id="features"
    className="wizard-section bg-wizard-bg-primary"
    aria-labelledby="features-heading"
  >
    <div id="main-content" className="wizard-container">
      <div className="text-center mb-16">
        <h2
          id="features-heading"
          className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4 wizard-text"
        >
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
);
