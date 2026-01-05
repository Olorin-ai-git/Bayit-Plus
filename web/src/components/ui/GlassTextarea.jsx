import { forwardRef, useEffect, useRef } from 'react';
import { clsx } from 'clsx';

const GlassTextarea = forwardRef(({
  label,
  error,
  hint,
  autoResize = false,
  className,
  containerClassName,
  ...props
}, ref) => {
  const textareaRef = useRef(null);
  const combinedRef = ref || textareaRef;

  useEffect(() => {
    if (autoResize && combinedRef.current) {
      const textarea = combinedRef.current;
      const adjustHeight = () => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      };

      textarea.addEventListener('input', adjustHeight);
      adjustHeight();

      return () => textarea.removeEventListener('input', adjustHeight);
    }
  }, [autoResize, combinedRef]);

  return (
    <div className={clsx('w-full', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-dark-300 mb-2">
          {label}
        </label>
      )}
      <textarea
        ref={combinedRef}
        className={clsx(
          'glass-textarea',
          error && 'glass-input-error',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-dark-400">{hint}</p>
      )}
    </div>
  );
});

GlassTextarea.displayName = 'GlassTextarea';

export default GlassTextarea;
