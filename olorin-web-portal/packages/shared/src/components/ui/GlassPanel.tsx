import React from 'react';

export interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

/**
 * GlassPanel Component
 *
 * Interactive glassmorphic panel with wizard theme.
 * Features purple accent border and hover glow effect.
 *
 * @example
 * <GlassPanel>
 *   <h3>Panel Title</h3>
 *   <p>Panel content goes here</p>
 * </GlassPanel>
 */
export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  noPadding = false,
}) => {
  const paddingClass = noPadding ? '' : 'p-6';
  const panelClass = `wizard-panel ${paddingClass} ${className}`;

  return (
    <div className={panelClass}>
      {children}
    </div>
  );
};

export default GlassPanel;
