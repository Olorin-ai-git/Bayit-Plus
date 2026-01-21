/**
 * WizardPanel Component
 * Feature: 004-new-olorin-frontend
 *
 * Collapsible panel component with consistent Olorin styling.
 * Used for Settings page sections and expandable content.
 */

import React, { useState } from 'react';

export interface WizardPanelProps {
  /** Panel title */
  title: string;
  /** Panel content */
  children: React.ReactNode;
  /** Initial expanded state (uncontrolled mode) */
  defaultExpanded?: boolean;
  /** Controlled expanded state */
  isExpanded?: boolean;
  /** Callback when expansion state changes (controlled mode) */
  onToggle?: () => void;
  /** Optional icon to display next to title */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * WizardPanel component with collapsible functionality
 * Supports both controlled and uncontrolled modes
 */
export const WizardPanel: React.FC<WizardPanelProps> = ({
  title,
  children,
  defaultExpanded = true,
  isExpanded,
  onToggle,
  icon,
  className = ''
}) => {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Use controlled state if provided, otherwise use internal state
  const expanded = isExpanded !== undefined ? isExpanded : internalExpanded;

  const toggleExpanded = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded(prev => !prev);
    }
  };

  return (
    <div
      className={`bg-black/40 backdrop-blur-md border-2 border-corporate-accentPrimary/40 hover:border-corporate-accentPrimary/60 rounded-lg transition-all ${className}`}
    >
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/50 transition-colors rounded-t-lg border-b border-corporate-accentPrimary/20 cursor-pointer relative z-10"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-corporate-accentPrimary">{icon}</span>}
          <h3 className="text-lg font-semibold text-corporate-accentPrimary">
            {title}
          </h3>
        </div>
        <svg
          className={`w-5 h-5 text-corporate-textSecondary transform transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 py-3 border-t border-corporate-accentPrimary/20">
          {children}
        </div>
      )}
    </div>
  );
};
