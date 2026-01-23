import React from 'react';
import { TFunction } from 'i18next';
import { GlassCard, GlowingIcon } from '@olorin/shared';

interface Solution {
  icon: React.ReactNode;
  name: string;
  description: string;
}

interface Props {
  solutions: Solution[];
  t: TFunction;
}

export const SolutionsSection: React.FC<Props> = ({ solutions, t }) => (
  <section
    className="wizard-section bg-wizard-bg-deep"
    aria-labelledby="solutions-heading"
  >
    <div className="wizard-container">
      <div className="text-center mb-16">
        <h2
          id="solutions-heading"
          className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4"
        >
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
);
