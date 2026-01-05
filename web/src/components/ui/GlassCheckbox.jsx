import { forwardRef } from 'react';
import { clsx } from 'clsx';

const GlassCheckbox = forwardRef(({
  label,
  error,
  className,
  containerClassName,
  ...props
}, ref) => {
  return (
    <div className={clsx('w-full', containerClassName)}>
      <label className="inline-flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            className="peer sr-only"
            {...props}
          />
          <div className={clsx(
            'w-5 h-5 rounded transition-all duration-200',
            'bg-dark-800/50 border border-white/10',
            'peer-checked:bg-primary-500 peer-checked:border-primary-500',
            'peer-focus:ring-2 peer-focus:ring-primary-500/30',
            'group-hover:border-white/20',
            className
          )}>
            <svg
              className="w-5 h-5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 absolute top-0 left-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <svg
            className="w-5 h-5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 absolute top-0 left-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        {label && (
          <span className="text-sm text-dark-200 group-hover:text-white transition-colors">
            {label}
          </span>
        )}
      </label>
      {error && (
        <p className="mt-1.5 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
});

GlassCheckbox.displayName = 'GlassCheckbox';

export default GlassCheckbox;
