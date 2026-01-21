/**
 * Empty State Component
 * Displays when no investigations match filters
 */

import React from 'react';

interface EmptyStateProps {
  onClearFilters?: () => void;
  onCreateNew?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onClearFilters, onCreateNew }) => {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-xl font-semibold text-corporate-textPrimary mb-2">
        No investigations found
      </h3>
      <p className="text-corporate-textSecondary mb-6 max-w-md mx-auto">
        Try clearing the filters or create a new investigation to get started.
      </p>
      <div className="flex gap-4 justify-center">
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textSecondary hover:border-corporate-accentPrimary transition-colors"
          >
            Clear Filters
          </button>
        )}
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-corporate-accentPrimary/50 transition-all"
          >
            New Investigation
          </button>
        )}
      </div>
    </div>
  );
};

