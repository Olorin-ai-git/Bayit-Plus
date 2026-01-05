import { forwardRef } from 'react';
import { clsx } from 'clsx';

const GlassInput = forwardRef(({
  label,
  error,
  hint,
  icon,
  iconPosition = 'start',
  className,
  containerClassName,
  type = 'text',
  ...props
}, ref) => {
  return (
    <div className={clsx('w-full', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-dark-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && iconPosition === 'start' && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-dark-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={clsx(
            'glass-input',
            error && 'glass-input-error',
            icon && iconPosition === 'start' && 'pr-12',
            icon && iconPosition === 'end' && 'pl-12',
            className
          )}
          {...props}
        />
        {icon && iconPosition === 'end' && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-dark-400">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-dark-400">{hint}</p>
      )}
    </div>
  );
});

GlassInput.displayName = 'GlassInput';

export default GlassInput;
