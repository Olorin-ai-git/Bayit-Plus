import React from 'react';
import { PortalDomain, PORTAL_BRANDS } from '../../types/branding.types';

export interface WizardLogoProps {
  variant?: PortalDomain;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

/**
 * WizardLogo Component
 *
 * Displays the Olorin wizard mascot logo with domain-specific variants.
 * Each variant represents a different subdomain (main, fraud, streaming, radio, omen).
 *
 * Variants:
 * - main: Olorin.AI (parent portal)
 * - fraud: Olorin.AI Fraud (fraud detection)
 * - streaming: Olorin.ai Media Enrichment (media streaming)
 * - radio: Olorin.ai Media Enrichment (radio management)
 * - omen: Olorin.AI Omen (speech translation)
 *
 * @example
 * <WizardLogo variant="fraud" size="lg" showText />
 */
export const WizardLogo: React.FC<WizardLogoProps> = ({
  variant = 'main',
  size = 'md',
  className = '',
  showText = true,
}) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
  };

  const textSizeClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const brand = PORTAL_BRANDS[variant];
  const logoSrc = `/logos/wizard/${variant}.png`;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Wizard Icon/Logo */}
      <img
        src={logoSrc}
        alt={`${brand.fullName} logo`}
        className={`${sizeClasses[size]} wizard-logo glow-icon`}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />

      {/* Logo Text */}
      {showText && (
        <span className={`${textSizeClasses[size]} wizard-text font-bold tracking-wide`}>
          {brand.logoText}
        </span>
      )}
    </div>
  );
};

export default WizardLogo;
