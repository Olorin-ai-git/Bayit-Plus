/**
 * Evidence Filters Hook
 *
 * Custom hook for managing evidence filtering, sorting, and search functionality.
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import { useCallback, useMemo, useState } from 'react';

export interface Evidence {
  id: string;
  title: string;
  description?: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'data' | 'log' | 'network' | 'financial';
  source: string;
  timestamp: string;
  confidence: number;
  relevance: number;
  tags: string[];
  metadata: Record<string, unknown>;
  relationships?: {
    domainId?: string;
    agentId?: string;
    investigationId?: string;
    relatedEvidenceIds?: string[];
  };
  content?: {
    preview?: string;
    fullText?: string;
    fileSize?: number;
    mimeType?: string;
    downloadUrl?: string;
  };
}

type SortField = 'timestamp' | 'confidence' | 'relevance' | 'type' | 'source';
type SortOrder = 'asc' | 'desc';

export interface UseEvidenceFiltersProps {
  evidence: Evidence[];
}

export const useEvidenceFilters = ({ evidence }: UseEvidenceFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [confidenceRange, setConfidenceRange] = useState<[number, number]>([0, 1]);
  const [relevanceRange, setRelevanceRange] = useState<[number, number]>([0, 1]);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Get unique types and tags for filtering
  const evidenceTypes = useMemo(() =>
    Array.from(new Set(evidence.map(e => e.type))), [evidence]
  );

  const allTags = useMemo(() =>
    Array.from(new Set(evidence.flatMap(e => e.tags))), [evidence]
  );

  // Filter and sort evidence
  const filteredEvidence = useMemo(() => {
    let filtered = [...evidence];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(searchLower) ||
        e.description?.toLowerCase().includes(searchLower) ||
        e.source.toLowerCase().includes(searchLower) ||
        e.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        e.content?.preview?.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (selectedTypes.size > 0) {
      filtered = filtered.filter(e => selectedTypes.has(e.type));
    }

    // Apply tag filter
    if (selectedTags.size > 0) {
      filtered = filtered.filter(e =>
        e.tags.some(tag => selectedTags.has(tag))
      );
    }

    // Apply confidence range filter
    filtered = filtered.filter(e =>
      e.confidence >= confidenceRange[0] && e.confidence <= confidenceRange[1]
    );

    // Apply relevance range filter
    filtered = filtered.filter(e =>
      e.relevance >= relevanceRange[0] && e.relevance <= relevanceRange[1]
    );

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'confidence':
          aValue = a.confidence;
          bValue = b.confidence;
          break;
        case 'relevance':
          aValue = a.relevance;
          bValue = b.relevance;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'source':
          aValue = a.source;
          bValue = b.source;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [evidence, searchTerm, selectedTypes, selectedTags, confidenceRange, relevanceRange, sortField, sortOrder]);

  const toggleTypeFilter = useCallback((type: string) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  const toggleTagFilter = useCallback((tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedTypes(new Set());
    setSelectedTags(new Set());
    setConfidenceRange([0, 1]);
    setRelevanceRange([0, 1]);
  }, []);

  return {
    // Filter state
    searchTerm,
    selectedTypes,
    selectedTags,
    confidenceRange,
    relevanceRange,
    sortField,
    sortOrder,

    // Derived data
    evidenceTypes,
    allTags,
    filteredEvidence,

    // Filter actions
    setSearchTerm,
    toggleTypeFilter,
    toggleTagFilter,
    setConfidenceRange,
    setRelevanceRange,
    setSortField,
    setSortOrder,
    clearFilters,
  };
};