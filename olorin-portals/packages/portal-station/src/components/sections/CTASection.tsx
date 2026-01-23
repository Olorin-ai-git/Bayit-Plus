import React from 'react';
import { TFunction } from 'i18next';

interface Props {
  t: TFunction;
  onGetStarted: () => void;
}

export const CTASection: React.FC<Props> = ({ t, onGetStarted }) => (
  <section
    className="wizard-section wizard-gradient-bg wizard-particles"
    aria-label={String(t('accessibility.callToAction'))}
  >
    <div className="wizard-container">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-6">
          {t('cta.title')}
        </h2>
        <p className="text-lg md:text-xl text-wizard-text-secondary mb-10">
          {t('cta.subtitle')}
        </p>
        <button
          onClick={onGetStarted}
          className="wizard-button text-lg px-10 py-4"
          aria-label={String(t('accessibility.getStartedContact'))}
        >
          {t('cta.button')}
        </button>
      </div>
    </div>
  </section>
);
