/**
 * GlassInput Component
 * Glassmorphic input field with dark mode support
 */

import React from 'react';

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  className = '',
  error = false,
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
    hover:bg-white/10
    disabled:opacity-40 disabled:cursor-not-allowed
    min-h-[44px]
  `.trim().replace(/\s+/g, ' ');

  return <input className={`${baseClass} ${className}`} {...props} />;
};

export default GlassInput;
