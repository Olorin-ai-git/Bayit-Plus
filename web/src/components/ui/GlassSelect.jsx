import { forwardRef } from 'react';
import { clsx } from 'clsx';

const GlassSelect = forwardRef(({
  label,
  error,
  hint,
  placeholder,
  options = [],
  className,
  containerClassName,
  ...props
}, ref) => {
  return (
    <div className={clsx('w-full', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-dark-300 mb-2">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          'glass-select',
          error && 'glass-input-error',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-sm text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-dark-400">{hint}</p>
      )}
    </div>
  );
});

GlassSelect.displayName = 'GlassSelect';

export default GlassSelect;
