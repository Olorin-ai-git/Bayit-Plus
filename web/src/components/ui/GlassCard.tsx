import { clsx } from 'clsx';

const variants = {
  default: 'glass-card',
  sm: 'glass-card-sm',
  bordered: 'glass border-2',
  strong: 'glass-strong shadow-glass',
};

const paddings = {
  none: '',
  sm: 'p-4',
  default: 'p-6',
  lg: 'p-8',
};

export default function GlassCard({
  variant = 'default',
  padding = 'default',
  hover = false,
  glow = false,
  glowColor = 'primary',
  className,
  children,
  ...props
}) {
  const glowClasses = {
    primary: 'hover:shadow-glow',
    success: 'hover:shadow-glow-success',
    danger: 'hover:shadow-glow-danger',
    purple: 'hover:shadow-glow-purple',
    warning: 'hover:shadow-glow-warning',
  };

  return (
    <div
      className={clsx(
        variants[variant],
        paddings[padding],
        hover && 'transition-all duration-300 hover:translate-y-[-2px] hover:shadow-glass-lg',
        glow && glowClasses[glowColor],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
