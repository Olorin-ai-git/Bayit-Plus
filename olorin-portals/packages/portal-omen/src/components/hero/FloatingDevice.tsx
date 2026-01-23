import React from 'react';
import { DeviceImage } from './DeviceImage';
import { WizardSprite } from './WizardSprite';

interface FloatingDeviceProps {
  deviceImageSrc: string;
  wizardImageSrc: string;
  showWizard?: boolean;
}

export const FloatingDevice: React.FC<FloatingDeviceProps> = ({
  deviceImageSrc,
  wizardImageSrc,
  showWizard = false,
}) => {
  return (
    <div className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] flex items-center justify-center px-4 md:px-0">
      {/* Head silhouette background (inline SVG) */}
      <svg
        viewBox="0 0 200 300"
        className="absolute w-48 h-64 sm:w-56 sm:h-72 md:w-64 md:h-80 opacity-10"
        aria-hidden="true"
      >
        <ellipse
          cx="100"
          cy="120"
          rx="80"
          ry="100"
          fill="white"
        />
      </svg>

      {/* Wizard and energy line */}
      <WizardSprite
        imageSrc={wizardImageSrc}
        visible={showWizard}
      />

      {/* Device image */}
      <DeviceImage imageSrc={deviceImageSrc} />
    </div>
  );
};
