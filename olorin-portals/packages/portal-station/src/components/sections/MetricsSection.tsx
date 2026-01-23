import React from 'react';
import { TFunction } from 'i18next';
import { GlassCard, GlowingIcon } from '@olorin/shared';
import { Radio } from 'lucide-react';

interface Metric {
  value: string;
  label: string;
}

interface Props {
  metrics: Metric[];
  t: TFunction;
  onRequestDemo: () => void;
}

export const MetricsSection: React.FC<Props> = ({ metrics, t, onRequestDemo }) => (
  <section
    className="wizard-section bg-wizard-bg-primary"
    aria-labelledby="metrics-heading"
  >
    <div className="wizard-container">
      <div className="max-w-5xl mx-auto">
        <GlassCard variant="hero" className="p-12">
          <div className="text-center mb-8">
            <div className="mb-6 flex justify-center">
              <GlowingIcon
                icon={<Radio className="w-16 h-16" aria-hidden="true" />}
                color="radio"
                size="xl"
                animate
              />
            </div>
            <h2
              id="metrics-heading"
              className="text-3xl md:text-4xl font-bold wizard-text mb-4"
            >
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
              onClick={onRequestDemo}
              className="wizard-button text-lg px-10 py-4"
              aria-label={String(t('accessibility.requestDemoFromMetrics'))}
            >
              {t('cta.button')}
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  </section>
);
