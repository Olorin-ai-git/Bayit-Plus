import { ReactNode } from 'react';

interface GlassButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  as?: any;
}

export function GlassButton({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  size = 'md',
  as: Component = 'button',
}: GlassButtonProps) {
  const baseStyles = 'rounded-lg font-semibold transition-all duration-200 backdrop-blur-xl';

  // iOS HIG compliant touch targets (44x44pt minimum)
  const sizeStyles = {
    sm: 'px-4 py-3 text-sm min-h-[44px]',      // 44px minimum
    md: 'px-6 py-3.5 min-h-[44px]',            // 44px minimum
    lg: 'px-8 py-4 text-lg min-h-[56px]',      // Larger for prominence
  };

  const variantStyles = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    outline: 'bg-transparent hover:bg-white/5 text-white border border-white/30',
  };

  // WCAG 2.1 compliant focus indicators
  const focusStyles = 'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black';

  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <Component
      onClick={disabled ? undefined : onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${focusStyles} ${disabledStyles} ${className}`}
      disabled={disabled}
    >
      {children}
    </Component>
  );
}
