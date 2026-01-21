/**
 * Toolbar Component - Glassmorphic toolbar with filters/actions
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React from 'react';

export interface ToolbarProps {
  children: React.ReactNode;
  className?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  children,
  className = '',
  left,
  right,
}) => {
  return (
    <div
      className={`glass-md rounded-lg border border-corporate-borderPrimary/40 p-4 ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        {left && <div className="flex items-center gap-2">{left}</div>}
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          {children}
        </div>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
    </div>
  );
};

