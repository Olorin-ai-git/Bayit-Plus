/**
 * GlassTextArea Component
 * Glassmorphic textarea field with dark mode support
 */

import React from 'react';

export interface GlassTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const GlassTextArea: React.FC<GlassTextAreaProps> = ({
  className = '',
  error = false,
  ...props
}) => {
  const baseClass = `
    wizard-textarea
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
    min-h-[88px]
    resize-vertical
  `.trim().replace(/\s+/g, ' ');

  return <textarea className={`${baseClass} ${className}`} {...props} />;
};

export default GlassTextArea;
