/**
 * UseCaseDetail Component
 * Displays detailed information about a use case
 */

import React from 'react';
import { GlassCard, GlowingIcon } from '../components';
import { CheckCircle } from 'lucide-react';
import { AccentColor } from '../types/branding.types';

export interface UseCase {
  id: string;
  title: string;
  industry: string;
  icon: React.ReactNode;
  challenge: string;
  solution: string;
  results: { metric: string; value: string }[];
  features: string[];
  testimonial?: { quote: string; author: string; role: string };
}

export interface UseCaseDetailProps {
  useCase: UseCase;
  accentColor: AccentColor;
}

export const UseCaseDetail: React.FC<UseCaseDetailProps> = ({ useCase, accentColor }) => {
  return (
    <div className="max-w-5xl mx-auto">
      <GlassCard variant="hero" className="p-8 md:p-12">
        <div className="flex items-center space-x-4 mb-8">
          <GlowingIcon icon={useCase.icon} color={accentColor} size="xl" animate />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold wizard-text">{useCase.title}</h2>
            <p className="text-wizard-text-secondary">{useCase.industry}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-wizard-accent-purple mb-3 flex items-center">
              <span className="w-2 h-2 rounded-full bg-red-400 mr-2" /> Challenge
            </h3>
            <p className="text-wizard-text-secondary">{useCase.challenge}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-wizard-accent-purple mb-3 flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-400 mr-2" /> Solution
            </h3>
            <p className="text-wizard-text-secondary">{useCase.solution}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {useCase.results.map((result) => (
            <div key={result.metric} className="text-center p-4 bg-wizard-bg-deep/50 rounded-lg">
              <div className="text-2xl md:text-3xl font-bold wizard-text mb-1">{result.value}</div>
              <div className="text-wizard-text-secondary text-sm">{result.metric}</div>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-wizard-text-primary mb-4">Key Features Used</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {useCase.features.map((feature) => (
              <div key={feature} className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-wizard-text-secondary">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {useCase.testimonial && (
          <div className="border-t border-wizard-border-primary pt-8">
            <blockquote className="text-lg text-wizard-text-secondary italic mb-4">
              "{useCase.testimonial.quote}"
            </blockquote>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-wizard-accent-purple/20 flex items-center justify-center">
                <span className="text-wizard-accent-purple font-bold">{useCase.testimonial.author.charAt(0)}</span>
              </div>
              <div>
                <div className="text-wizard-text-primary font-semibold">{useCase.testimonial.author}</div>
                <div className="text-wizard-text-secondary text-sm">{useCase.testimonial.role}</div>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default UseCaseDetail;
