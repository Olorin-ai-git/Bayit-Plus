/**
 * Use Case Card Component
 *
 * Displays an industry-specific use case with fraud scenarios.
 */

import React from 'react';

export interface UseCase {
  id: string;
  industry: string;
  icon: string;
  title: string;
  description: string;
  challenges: string[];
  solutions: string[];
  metrics: { label: string; value: string }[];
  color: string;
}

interface UseCaseCardProps {
  useCase: UseCase;
}

export const UseCaseCard: React.FC<UseCaseCardProps> = ({ useCase }) => {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${useCase.color}20` }}
          >
            {useCase.icon}
          </div>
          <div>
            <span className="text-xs font-medium text-corporate-textMuted uppercase tracking-wider">
              {useCase.industry}
            </span>
            <h3 className="text-xl font-semibold text-corporate-textPrimary">{useCase.title}</h3>
          </div>
        </div>

        <p className="text-corporate-textSecondary mb-6">{useCase.description}</p>

        {/* Challenges */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-corporate-textMuted mb-2">Key Challenges</h4>
          <ul className="space-y-2">
            {useCase.challenges.map((challenge, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-corporate-textSecondary">
                <span className="text-corporate-error mt-0.5">•</span>
                {challenge}
              </li>
            ))}
          </ul>
        </div>

        {/* Solutions */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-corporate-textMuted mb-2">Olorin Solution</h4>
          <ul className="space-y-2">
            {useCase.solutions.map((solution, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-corporate-textSecondary">
                <span className="text-corporate-success mt-0.5">✓</span>
                {solution}
              </li>
            ))}
          </ul>
        </div>

        {/* Metrics */}
        <div
          className="mt-6 p-4 rounded-lg"
          style={{ backgroundColor: `${useCase.color}10`, borderColor: `${useCase.color}30` }}
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            {useCase.metrics.map((metric, idx) => (
              <div key={idx}>
                <span className="text-lg font-bold" style={{ color: useCase.color }}>
                  {metric.value}
                </span>
                <p className="text-xs text-corporate-textMuted">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseCaseCard;
