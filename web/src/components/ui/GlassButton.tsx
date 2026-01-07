import { forwardRef } from 'react';
import { clsx } from 'clsx';

const variants = {
  primary: 'glass-btn-primary',
  secondary: 'glass-btn-secondary',
  success: 'glass-btn-success',
  danger: 'glass-btn-danger',
  purple: 'glass-btn-purple',
  ghost: 'glass-btn-ghost',
};

const sizes = {
  sm: 'glass-btn-sm',
  default: '',
  lg: 'glass-btn-lg',
  icon: 'glass-btn-icon',
  'icon-sm': 'glass-btn-icon-sm',
};

const GlassButton = forwardRef(({
  variant = 'primary',
  size = 'default',
  icon,
  iconPosition = 'start',
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}, ref) => {
  const isIconOnly = size === 'icon' || size === 'icon-sm';

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {!isIconOnly && <span>טוען...</span>}
        </>
      ) : (
        <>
          {icon && iconPosition === 'start' && !isIconOnly && (
            <span className="flex-shrink-0">{icon}</span>
          )}
          {isIconOnly ? icon : children}
          {icon && iconPosition === 'end' && !isIconOnly && (
            <span className="flex-shrink-0">{icon}</span>
          )}
        </>
      )}
    </button>
  );
});

GlassButton.displayName = 'GlassButton';

export default GlassButton;
