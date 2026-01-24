/**
 * GlassInput Component
 * Glassmorphic input field with dark mode support
 * iOS optimized with inputMode, autoComplete, and safe area handling
 */

import React from 'react';

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
}

export const GlassInput: React.FC<GlassInputProps> = ({
  className = '',
  error = false,
  inputMode,
  autoComplete = 'on',
  autoCapitalize = 'off',
  ...props
}) => {
  const baseClass = `
    wizard-input
    w-full
    px-4 py-3
    bg-white/5 backdrop-blur-md
    border ${error ? 'border-red-500/50' : 'border-white/10'}
    rounded-lg
    text-white placeholder-white/40
    transition-all duration-200
    focus:bg-white/10 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20
    focus-visible:ring-2 focus-visible:ring-wizard-accent-purple
    hover:bg-white/10
    disabled:opacity-40 disabled:cursor-not-allowed
    min-h-[44px]
    [-webkit-tap-highlight-color:transparent]
  `.trim().replace(/\s+/g, ' ');

  return (
    <input
      className={`${baseClass} ${className}`}
      inputMode={inputMode}
      autoComplete={autoComplete}
      autoCapitalize={autoCapitalize}
      {...props}
    />
  );
};

export default GlassInput;
