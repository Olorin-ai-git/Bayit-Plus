import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  const baseStyles = 'appearance-none relative block w-full px-4 py-3 placeholder-corporate-textTertiary text-corporate-textPrimary rounded-lg focus:outline-none focus:ring-2 focus:z-10 sm:text-sm bg-black/30 backdrop-blur transition-colors duration-200';

  const borderStyles = error
    ? 'border-2 border-red-500 focus:ring-red-500 focus:border-red-500'
    : 'border-2 border-corporate-accentPrimary/40 focus:ring-corporate-accentPrimary focus:border-corporate-accentPrimary';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-corporate-textPrimary mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={`${baseStyles} ${borderStyles} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-2 text-sm text-corporate-textTertiary">{helperText}</p>
      )}
    </div>
  );
};
