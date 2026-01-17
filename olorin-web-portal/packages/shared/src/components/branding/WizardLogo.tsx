import React from 'react';

export interface WizardLogoProps {
  variant?: 'main' | 'fraud' | 'streaming' | 'radio';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

/**
 * WizardLogo Component
 *
 * Displays the Olorin wizard mascot logo with domain-specific variants.
 * Each variant represents a different subdomain (main, fraud, streaming, radio).
 *
 * Variants:
 * - main: Olorin.AI (parent portal)
 * - fraud: Olorin.AI Fraud (fraud detection)
 * - streaming: Olorin.AI Streaming (media streaming)
 * - radio: Olorin.AI Radio (radio management)
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
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const logoText = {
    main: 'OLORIN.AI',
    fraud: 'OLORIN.AI FRAUD',
    streaming: 'OLORIN.AI STREAMING',
    radio: 'OLORIN.AI RADIO',
  };

  // Wizard logo from organized logos directory (transparent purple wizard)
  const logoSrc = `/logos/wizard/${variant}.png`;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Wizard Icon/Logo */}
      <img
        src={logoSrc}
        alt={`Olorin ${variant} logo`}
        className={`${sizeClasses[size]} wizard-logo glow-icon`}
        onError={(e) => {
          // Fallback to text if image not found
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />

      {/* Logo Text */}
      {showText && (
        <span className={`${textSizeClasses[size]} wizard-text font-bold tracking-wide`}>
          {logoText[variant]}
        </span>
      )}
    </div>
  );
};

export default WizardLogo;
