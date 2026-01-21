/**
 * EvidencePanel Component
 *
 * An interactive panel for displaying, filtering, and searching evidence
 * with comprehensive visualization and interaction capabilities.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React, { useCallback, useState } from 'react';
import { useEvidenceFilters, Evidence } from './hooks/useEvidenceFilters';
import { EvidenceItem } from './components/EvidenceItem';

export interface EvidencePanelProps {
  /** Evidence items to display */
  evidence: Evidence[];
  /** Panel height */
  height?: number;
  /** Enable search functionality */
  enableSearch?: boolean;
  /** Enable filtering by evidence types */
  enableFiltering?: boolean;
  /** Enable sorting options */
  enableSorting?: boolean;
  /** Show evidence preview */
  showPreview?: boolean;
  /** Show confidence scores */
  showConfidence?: boolean;
  /** Show relevance scores */
  showRelevance?: boolean;
  /** Enable energy mode visualization for power grid concept */
  energyMode?: boolean;
  /** Custom evidence renderer */
  evidenceRenderer?: (evidence: Evidence) => React.ReactNode;
  /** Callback for evidence selection */
  onEvidenceSelect?: (evidence: Evidence) => void;
  /** Callback for evidence preview */
  onEvidencePreview?: (evidence: Evidence) => void;
  /** Callback for evidence download */
  onEvidenceDownload?: (evidence: Evidence) => void;
  /** Custom styling classes */
  className?: string;
}


export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidence,
  height = 400,
  enableSearch = true,
  enableFiltering = true,
  enableSorting = true,
  showPreview = true,
  showConfidence = true,
  showRelevance = true,
  energyMode = false,
  evidenceRenderer,
  onEvidenceSelect,
  onEvidencePreview,
  onEvidenceDownload,
  className = '',
}) => {
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);

  const {
    searchTerm,
    selectedTypes,
    selectedTags,
    confidenceRange,
    relevanceRange,
    sortField,
    sortOrder,
    evidenceTypes,
    allTags,
    filteredEvidence,
    setSearchTerm,
    toggleTypeFilter,
    toggleTagFilter,
    setConfidenceRange,
    setRelevanceRange,
    setSortField,
    setSortOrder,
    clearFilters,
  } = useEvidenceFilters({ evidence });


  const handleEvidenceClick = useCallback((ev: Evidence) => {
    setSelectedEvidence(ev.id);
    onEvidenceSelect?.(ev);
  }, [onEvidenceSelect]);

  const getEvidenceIcon = (type: string) => {
    const icons = {
      document: '📄', image: '🖼️', video: '🎥', audio: '🎵',
      data: '📊', log: '📝', network: '🌐', financial: '💰'
    };
    return icons[type as keyof typeof icons] || '📎';
  };

  const formatScore = (score: number) => Math.round(score * 100);

  return (
    <div className={`evidence-panel flex flex-col bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header with search and filters */}
      <div className={`p-4 border-b border-gray-200 space-y-3 ${energyMode ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : ''}`}>
        {energyMode && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-600">⚡</span>
            <h3 className="text-lg font-medium text-blue-900">Evidence Energy Flow</h3>
            <div className="ml-auto flex items-center gap-2 text-sm text-blue-700">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Active</span>
            </div>
          </div>
        )}
        {enableSearch && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute left-3 top-2.5 w-4 h-4 text-gray-400">
              🔍
            </div>
          </div>
        )}

        {enableFiltering && (
          <div className="space-y-3">
            {/* Type filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Types:</span>
              {evidenceTypes.map(type => (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(type)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedTypes.has(type)
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getEvidenceIcon(type)} {type}
                </button>
              ))}
            </div>

            {/* Tag filters */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Tags:</span>
                {allTags.slice(0, 10).map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTagFilter(tag)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      selectedTags.has(tag)
                        ? 'bg-green-100 border-green-300 text-green-800'
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {allTags.length > 10 && (
                  <span className="text-xs text-gray-500">+{allTags.length - 10} more</span>
                )}
              </div>
            )}

            {/* Range filters */}
            {(showConfidence || showRelevance) && (
              <div className="grid grid-cols-2 gap-4">
                {showConfidence && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Confidence</label>
                    <div className="mt-1 text-xs text-gray-500">
                      {formatScore(confidenceRange[0])}% - {formatScore(confidenceRange[1])}%
                    </div>
                  </div>
                )}
                {showRelevance && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Relevance</label>
                    <div className="mt-1 text-xs text-gray-500">
                      {formatScore(relevanceRange[0])}% - {formatScore(relevanceRange[1])}%
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sort controls */}
        {enableSorting && (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="timestamp">Timestamp</option>
              <option value="confidence">Confidence</option>
              <option value="relevance">Relevance</option>
              <option value="type">Type</option>
              <option value="source">Source</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {filteredEvidence.length} of {evidence.length} evidence items
          </div>
          {(selectedTypes.size > 0 || selectedTags.size > 0 || searchTerm) && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Evidence list */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: height }}>
        {filteredEvidence.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredEvidence.map(ev => (
              <EvidenceItem
                key={ev.id}
                evidence={ev}
                isSelected={selectedEvidence === ev.id}
                showPreview={showPreview}
                showConfidence={showConfidence}
                showRelevance={showRelevance}
                evidenceRenderer={evidenceRenderer}
                onSelect={handleEvidenceClick}
                onPreview={onEvidencePreview}
                onDownload={onEvidenceDownload}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">🔍</div>
              <p className="text-sm">No evidence found</p>
              {(searchTerm || selectedTypes.size > 0 || selectedTags.size > 0) && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Clear filters to see all evidence
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvidencePanel;