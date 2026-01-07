import { clsx } from 'clsx';

const variants = {
  default: 'glass-badge',
  primary: 'glass-badge-primary',
  success: 'glass-badge-success',
  danger: 'glass-badge-danger',
  warning: 'glass-badge-warning',
  purple: 'glass-badge-purple',
};

const sizes = {
  sm: 'glass-badge-sm',
  default: '',
  lg: 'glass-badge-lg',
};

export default function GlassBadge({
  variant = 'default',
  size = 'default',
  dot = false,
  dotColor,
  icon,
  className,
  children,
}) {
  const dotColors = {
    primary: 'bg-primary-400',
    success: 'bg-green-400',
    danger: 'bg-red-400',
    warning: 'bg-amber-400',
    purple: 'bg-purple-400',
    default: 'bg-dark-400',
  };

  const computedDotColor = dotColor || variant;

  return (
    <span
      className={clsx(
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full',
          dotColors[computedDotColor] || dotColors.default
        )} />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
