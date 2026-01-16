import React from 'react';

export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'interactive' | 'hero';
  onClick?: () => void;
}

/**
 * GlassCard Component
 *
 * Reusable glassmorphic card component with wizard theme.
 * Supports multiple variants: default, interactive (with hover effects), and hero (enhanced glow).
 *
 * @example
 * <GlassCard variant="interactive" onClick={handleClick}>
 *   <h3>Card Title</h3>
 *   <p>Card content goes here</p>
 * </GlassCard>
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  variant = 'default',
  onClick,
}) => {
  const baseClass = 'glass-card-wizard';

  const variantClasses = {
    default: baseClass,
    interactive: 'glass-card-wizard-interactive',
    hero: 'glass-card-hero',
  };

  const cardClass = `${variantClasses[variant]} ${className}`;

  return (
    <div
      className={cardClass}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </div>
  );
};

export default GlassCard;
