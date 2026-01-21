/**
 * Investigation List Component
 * Displays investigations in a grid layout
 */

import React from 'react';
import { Investigation } from '../types/investigations';
import { InvestigationCard } from './common/InvestigationCard';
import { EmptyState } from './EmptyState';
import LoadingSpinner from '@shared/components/LoadingSpinner';

interface InvestigationListProps {
  investigations: Investigation[];
  isLoading: boolean;
  error: string | null;
  onInvestigationClick: (investigation: Investigation) => void;
  onView?: (investigation: Investigation) => void;
  onDelete?: (investigation: Investigation) => void;
  onReplay?: (investigation: Investigation) => void;
  onCreateNew?: () => void;
  onClearFilters?: () => void;
  selectedInvestigations?: Set<string>;
  onSelectInvestigation?: (id: string, selected: boolean) => void;
}

export const InvestigationList: React.FC<InvestigationListProps> = ({
  investigations,
  isLoading,
  error,
  onInvestigationClick,
  onView,
  onDelete,
  onReplay,
  onCreateNew,
  onClearFilters,
  selectedInvestigations,
  onSelectInvestigation
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="md" />
          <p className="mt-2 text-sm text-corporate-textSecondary">
            Loading investigations...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-corporate-error mb-2">
          Error loading investigations
        </h3>
        <p className="text-corporate-textSecondary mb-6">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-corporate-error/80 text-white rounded-lg hover:bg-corporate-error transition-colors"
          aria-label="Retry loading investigations"
        >
          Retry
        </button>
      </div>
    );
  }

  if (investigations.length === 0) {
    return <EmptyState onClearFilters={onClearFilters} onCreateNew={onCreateNew} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {investigations.map((investigation) => (
        <InvestigationCard
          key={investigation.id}
          investigation={investigation}
          onClick={() => onInvestigationClick(investigation)}
          onView={onView ? () => onView(investigation) : undefined}
          onDelete={onDelete ? () => onDelete(investigation) : undefined}
          onReplay={onReplay ? () => onReplay(investigation) : undefined}
          isSelected={selectedInvestigations?.has(investigation.id)}
          onSelect={onSelectInvestigation ? (selected) => onSelectInvestigation(investigation.id, selected) : undefined}
        />
      ))}
    </div>
  );
};

