import React from 'react';
import { TFunction } from 'i18next';
import { GlassCard, GlowingIcon } from '@olorin/shared';

interface WorkflowStep {
  icon: React.ReactNode;
  color: 'radio';
  title: string;
  description: string;
}

interface Props {
  workflowSteps: WorkflowStep[];
  t: TFunction;
}

export const WorkflowSection: React.FC<Props> = ({ workflowSteps, t }) => (
  <section
    className="wizard-section bg-wizard-bg-deep"
    aria-labelledby="workflow-heading"
  >
    <div className="wizard-container">
      <div className="text-center mb-16">
        <h2
          id="workflow-heading"
          className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-4 wizard-text"
        >
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
);
