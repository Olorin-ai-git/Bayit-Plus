import React from 'react';
import { FloatingDevice } from './FloatingDevice';
import { HeroContent } from './HeroContent';

export interface HeroSectionProps {
  onCtaClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onCtaClick }) => {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-20 safe-top"
      aria-labelledby="main-headline"
    >
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {/* Floating Device */}
        <FloatingDevice
          deviceImageSrc="/images/Omen.webp"
          wizardImageSrc="/images/Wizard.png"
          showWizard={true}
        />

        {/* Hero Content */}
        <HeroContent onCtaClick={onCtaClick} />
      </div>
    </section>
  );
};
