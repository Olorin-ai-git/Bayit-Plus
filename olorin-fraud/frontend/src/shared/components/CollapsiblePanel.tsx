/**
 * CollapsiblePanel Component
 * Adapted from Olorin web plugin for Olorin frontend
 *
 * Reusable collapsible panel component with glasmorphic styling.
 * Provides consistent look and feel across all investigation sections.
 *
 * Features:
 * - Smooth expand/collapse animation
 * - Optional badges and action buttons in header
 * - Glasmorphic backdrop blur effect
 * - Corporate color tokens
 * - Configurable default expanded state
 */

import React, { ReactNode } from 'react';

export interface CollapsiblePanelProps {
  /** Panel title displayed in header */
  title: string;
  /** Panel content */
  children: ReactNode;
  /** Whether panel is expanded by default */
  defaultExpanded?: boolean;
  /** Optional badges to display in header (e.g., count, status) */
  badges?: ReactNode[];
  /** Optional action buttons in header (before collapse icon) */
  actionButtons?: ReactNode[];
  /** Optional className for additional styling */
  className?: string;
}

export function CollapsiblePanel({
  title,
  children,
  defaultExpanded = true,
  badges = [],
  actionButtons = [],
  className = '',
}: CollapsiblePanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div
      className={`bg-black/40 backdrop-blur-md rounded-lg border-2 border-corporate-accentPrimary/40 hover:border-corporate-accentPrimary/60 transition-all shadow-lg ${className}`}
    >
      {/* Header with expand/collapse and action buttons */}
      <div className="flex items-center px-4 py-3 rounded-t-lg border-b border-corporate-accentPrimary/20">
        {/* Expand/collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center gap-3 hover:opacity-90 transition-opacity"
        >
          <h3 className="text-lg font-semibold text-corporate-accentPrimary">{title}</h3>
          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex items-center gap-2">{badges}</div>
          )}
        </button>

        {/* Action buttons */}
        {actionButtons.length > 0 && (
          <div className="flex items-center gap-2 mr-3">{actionButtons}</div>
        )}

        {/* Expand/collapse icon */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-corporate-textSecondary hover:text-corporate-accentSecondary transition-colors flex-shrink-0"
        >
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${
              isExpanded ? 'rotate-180' : ''
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
      </div>

      {/* Content with smooth expand/collapse */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}

CollapsiblePanel.displayName = 'CollapsiblePanel';

export default CollapsiblePanel;
