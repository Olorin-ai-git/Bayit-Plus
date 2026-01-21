import React, { useEffect, useState } from 'react';
import { GlassButton } from './GlassButton';
import { glassTokens } from '../../styles/glass-tokens';

export interface HeroSectionProps {
  title: string;
  titleHighlight?: string | null;
  subtitle: string;
  primaryCTA?: {
    text: string;
    onClick: () => void;
  };
  secondaryCTA?: {
    text: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  backgroundPattern?: 'circuit' | 'particles' | 'gradient' | 'none' | 'video';
  backgroundVideo?: {
    src: string;
    posterSrc: string;
    captionsSrc?: string;
  };
  children?: React.ReactNode;
}

/**
 * HeroSection Component
 *
 * Customizable hero section with wizard theme.
 * Supports title with gradient highlight, subtitle, CTAs, and background patterns.
 *
 * @example
 * <HeroSection
 *   title="AI-POWERED"
 *   titleHighlight="FRAUD PREVENTION"
 *   subtitle="Secure your business with independent AI agents"
 *   primaryCTA={{ text: 'Get Started', onClick: handleCTA }}
 *   icon={<Shield className="w-24 h-24" />}
 *   backgroundPattern="circuit"
 * />
 */
export const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  titleHighlight,
  subtitle,
  primaryCTA,
  secondaryCTA,
  icon,
  backgroundPattern = 'gradient',
  children,
}) => {
  const backgroundClasses = {
    circuit: 'wizard-gradient-bg tech-circuit-bg',
    particles: 'wizard-gradient-bg wizard-particles',
    gradient: 'wizard-gradient-bg',
    none: '',
  };

  return (
    <section className={`${backgroundClasses[backgroundPattern]} py-20 md:py-32 relative overflow-hidden`}>
      <div className="wizard-container">
        <div className="text-center max-w-4xl mx-auto">
          {/* Hero Icon */}
          {icon && (
            <div className="mb-8 flex justify-center animate-float">
              <div className="glow-icon text-wizard-accent-purple">
                {icon}
              </div>
            </div>
          )}

          {/* Hero Title */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-wizard-text-primary mb-6 animate-fade-in-up">
            {title}
            {titleHighlight && (
              <>
                {' '}
                <span className="wizard-text">{titleHighlight}</span>
              </>
            )}
          </h1>

          {/* Hero Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-wizard-text-secondary mb-10 max-w-3xl mx-auto animate-fade-in-up animate-delay-100">
            {subtitle}
          </p>

          {/* CTA Buttons */}
          {(primaryCTA || secondaryCTA) && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-200">
              {primaryCTA && (
                <GlassButton
                  variant="wizard"
                  size="lg"
                  onClick={primaryCTA.onClick}
                >
                  {primaryCTA.text}
                </GlassButton>
              )}
              {secondaryCTA && (
                <GlassButton
                  variant="outline"
                  size="lg"
                  onClick={secondaryCTA.onClick}
                >
                  {secondaryCTA.text}
                </GlassButton>
              )}
            </div>
          )}

          {/* Custom Children */}
          {children && (
            <div className="mt-12 animate-fade-in-up animate-delay-300">
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
