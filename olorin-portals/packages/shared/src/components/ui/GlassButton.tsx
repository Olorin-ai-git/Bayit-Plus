import React from 'react';

export interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'wizard' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

/**
 * GlassButton Component
 *
 * Wizard-themed button with glassmorphic styling and glow effects.
 *
 * Variants:
 * - wizard: Purple gradient with glow (default)
 * - outline: Transparent with purple border
 * - ghost: Minimal styling with hover effect
 *
 * Sizes:
 * - sm: Small button (px-4 py-2)
 * - md: Medium button (px-6 py-3) - default
 * - lg: Large button (px-8 py-4)
 *
 * @example
 * <GlassButton variant="wizard" size="lg" onClick={handleClick}>
 *   Get Started
 * </GlassButton>
 */
export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  onClick,
  className = '',
  variant = 'wizard',
  size = 'md',
  type = 'button',
  disabled = false,
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    wizard: 'wizard-button',
    outline: 'bg-transparent border-2 border-wizard-accent-purple text-wizard-accent-purple hover:bg-wizard-accent-purple/20 hover:shadow-glow-purple transition-all duration-300 rounded-lg font-semibold',
    ghost: 'bg-transparent text-wizard-accent-purple hover:bg-wizard-accent-purple/10 transition-all duration-200 rounded-lg font-semibold px-4 py-2',
  };

  const disabledClass = disabled
    ? 'opacity-50 cursor-not-allowed pointer-events-none'
    : '';

  const buttonClass = `${variantClasses[variant]} ${sizeClasses[size]} ${disabledClass} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      className={buttonClass}
      disabled={disabled}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
};

export default GlassButton;
