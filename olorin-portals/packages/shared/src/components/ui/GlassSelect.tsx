/**
 * GlassSelect Component
 * Glassmorphic select dropdown with dark mode support
 */

import React from 'react';

export interface GlassSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
  className = '',
  error = false,
  children,
  ...props
}) => {
  const baseClass = `
    wizard-select
    w-full
    px-4 py-3
    bg-white/5 backdrop-blur-md
    border ${error ? 'border-red-500/50' : 'border-white/10'}
    rounded-lg
    text-white
    transition-all duration-200
    focus:bg-white/10 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20
    hover:bg-white/10
    disabled:opacity-40 disabled:cursor-not-allowed
    min-h-[44px]
    appearance-none
    bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=')]
    bg-[length:12px_8px]
    ltr:bg-[position:right_1rem_center] rtl:bg-[position:left_1rem_center]
    bg-no-repeat
    ltr:pr-12 rtl:pl-12
  `.trim().replace(/\s+/g, ' ');

  return (
    <select className={`${baseClass} ${className}`} {...props}>
      {children}
    </select>
  );
};

export default GlassSelect;
