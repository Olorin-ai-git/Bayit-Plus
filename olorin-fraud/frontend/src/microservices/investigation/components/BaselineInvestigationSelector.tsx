/**
 * Baseline Investigation Selector Component
 *
 * Allows selecting a previous investigation as the baseline for comparison.
 * When selected, creates a new investigation with the same window duration for comparison.
 *
 * Constitutional Compliance:
 * - All data from API (no hardcoded values)
 * - Loading and error states handled gracefully
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { investigationsManagementService } from '@microservices/investigations-management/services/investigationsManagementService';
import type { Investigation } from '@microservices/investigations-management/types/investigations';

interface BaselineInvestigationSelectorProps {
  selectedInvestigationId: string | null;
  onSelectInvestigation: (investigation: Investigation | null) => void;
  onRunComparison: (baselineInvestigation: Investigation) => void;
  isRunningComparison: boolean;
}

export const BaselineInvestigationSelector: React.FC<BaselineInvestigationSelectorProps> = ({
  selectedInvestigationId,
  onSelectInvestigation,
  onRunComparison,
  isRunningComparison
}) => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);

  const loadInvestigations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await investigationsManagementService.list({
        status: 'completed', // Only show completed investigations as baselines
        search: searchQuery || undefined
      });
      // Sort by created date (newest first)
      const sorted = data.sort((a, b) => {
        const dateA = a.created ? new Date(a.created).getTime() : 0;
        const dateB = b.created ? new Date(b.created).getTime() : 0;
        return dateB - dateA;
      });
      setInvestigations(sorted);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load investigations';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadInvestigations();
  }, [loadInvestigations]);

  useEffect(() => {
    if (selectedInvestigationId) {
      const found = investigations.find(inv => inv.id === selectedInvestigationId);
      if (found) {
        setSelectedInvestigation(found);
        onSelectInvestigation(found);
      }
    }
  }, [selectedInvestigationId, investigations, onSelectInvestigation]);

  const handleSelectInvestigation = (investigation: Investigation) => {
    setSelectedInvestigation(investigation);
    onSelectInvestigation(investigation);
  };

  const handleRunComparison = () => {
    if (selectedInvestigation) {
      onRunComparison(selectedInvestigation);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const getWindowDuration = (inv: Investigation): number | null => {
    if (!inv.from || !inv.to) return null;
    try {
      const start = new Date(inv.from);
      const end = new Date(inv.to);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  return (
    <Card variant="elevated" padding="lg">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">
            Select Baseline Investigation
          </h3>
          <p className="text-sm text-corporate-textSecondary mb-4">
            Choose a previous investigation to use as the baseline. A new investigation will be created 
            with the same time window duration for comparison.
          </p>
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search investigations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary focus:outline-none focus:border-corporate-accentPrimary"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm text-corporate-textSecondary">Loading investigations...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Investigation List */}
        {!isLoading && !error && (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {investigations.length === 0 ? (
              <p className="text-sm text-corporate-textSecondary text-center py-4">
                No completed investigations found
              </p>
            ) : (
              investigations.map((inv) => {
                const isSelected = selectedInvestigation?.id === inv.id;
                const windowDays = getWindowDuration(inv);
                
                return (
                  <div
                    key={inv.id}
                    onClick={() => handleSelectInvestigation(inv)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-corporate-accentPrimary/20 border-corporate-accentPrimary'
                        : 'bg-black/20 border-corporate-borderPrimary/40 hover:border-corporate-accentPrimary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-corporate-textPrimary">
                          {inv.name || inv.id}
                        </div>
                        <div className="text-xs text-corporate-textSecondary mt-1">
                          {inv.entity_type && inv.entity_id && (
                            <span>{inv.entity_type}: {inv.entity_id}</span>
                          )}
                          {inv.from && inv.to && (
                            <span className="ml-2">
                              {formatDate(inv.from)} - {formatDate(inv.to)}
                              {windowDays !== null && (
                                <span className="ml-1">({windowDays}d window)</span>
                              )}
                            </span>
                          )}
                        </div>
                        {inv.overall_risk_score !== undefined && (
                          <div className="text-xs text-corporate-textTertiary mt-1">
                            Risk Score: {(inv.overall_risk_score * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="ml-2 text-corporate-accentPrimary">✓</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Selected Investigation Info */}
        {selectedInvestigation && (
          <div className="p-4 bg-blue-900/20 border border-blue-500/50 rounded-lg">
            <div className="text-sm font-semibold text-blue-200 mb-2">Selected Baseline:</div>
            <div className="text-sm text-blue-300 space-y-1">
              <div><strong>Investigation:</strong> {selectedInvestigation.name || selectedInvestigation.id}</div>
              {selectedInvestigation.entity_type && selectedInvestigation.entity_id && (
                <div><strong>Entity:</strong> {selectedInvestigation.entity_type}: {selectedInvestigation.entity_id}</div>
              )}
              {selectedInvestigation.from && selectedInvestigation.to && (
                <>
                  <div><strong>Original Window:</strong> {formatDate(selectedInvestigation.from)} - {formatDate(selectedInvestigation.to)}</div>
                  {getWindowDuration(selectedInvestigation) !== null && (
                    <div><strong>Window Duration:</strong> {getWindowDuration(selectedInvestigation)} days</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Run Comparison Button */}
        {selectedInvestigation && (
          <Button
            onClick={handleRunComparison}
            disabled={isRunningComparison || !selectedInvestigation.from || !selectedInvestigation.to}
            className="w-full"
            variant="primary"
          >
            {isRunningComparison ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating Investigation & Running Comparison...
              </>
            ) : (
              'Run Comparison with New Investigation'
            )}
          </Button>
        )}
      </div>
    </Card>
  );
};

