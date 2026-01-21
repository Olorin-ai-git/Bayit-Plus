import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  headerAction,
  footer,
  variant = 'default',
  padding = 'md',
  onClick
}) => {
  const baseStyles = 'rounded-lg transition-all duration-200';

  const variantStyles = {
    default: 'bg-corporate-bgSecondary border border-corporate-borderPrimary',
    elevated: 'bg-corporate-bgSecondary shadow-lg shadow-black/50 border border-corporate-borderPrimary',
    outlined: 'bg-transparent border-2 border-corporate-accentPrimary/40',
    interactive: 'bg-corporate-bgSecondary border-2 border-corporate-accentPrimary/40 hover:border-corporate-accentPrimary/60 cursor-pointer hover:shadow-lg hover:shadow-corporate-accentPrimary/20'
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const cardClasses = `${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`;

  const cardContent = (
    <>
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-corporate-textPrimary">{title}</h3>}
            {subtitle && <p className="text-sm text-corporate-textSecondary mt-1">{subtitle}</p>}
          </div>
          {headerAction && <div className="ml-4">{headerAction}</div>}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div className="mt-4 pt-4 border-t border-corporate-borderPrimary">
          {footer}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={cardClasses}>
        {cardContent}
      </button>
    );
  }

  return <div className={cardClasses}>{cardContent}</div>;
};
