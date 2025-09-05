import React, { useState } from 'react';
import { RAGSourceEffectivenessProps, RAGKnowledgeSourceExtended } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';
import SourceEffectivenessHeader from './SourceEffectivenessHeader';
import SourceEffectivenessControls from './SourceEffectivenessControls';
import SourceEffectivenessGrid from './SourceEffectivenessGrid';

/**
 * RAG Source Effectiveness Component
 * Analyzes performance of individual knowledge sources
 */
const RAGSourceEffectiveness: React.FC<RAGSourceEffectivenessProps> = ({
  investigationId,
  sources = [],
  sortBy = 'effectiveness',
  showInactive = false,
}) => {
  const [liveSources, setLiveSources] = useState<RAGKnowledgeSourceExtended[]>(sources);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [currentSortBy, setSortBy] = useState(sortBy);
  const [currentShowInactive, setShowInactive] = useState(showInactive);

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onKnowledgeUpdate: (data) => {
      if (data.sourcesUpdate) {
        setLiveSources(data.sourcesUpdate);
      }
    },
  });

  const sortSources = (sources: RAGKnowledgeSourceExtended[]) => {
    return [...sources].sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (currentSortBy) {
        case 'effectiveness':
          aValue = a.effectiveness;
          bValue = b.effectiveness;
          break;
        case 'usage':
          aValue = a.usageCount;
          bValue = b.usageCount;
          break;
        case 'relevance':
          aValue = a.avgRelevance;
          bValue = b.avgRelevance;
          break;
        case 'freshness':
          aValue = new Date(a.lastUpdated).getTime();
          bValue = new Date(b.lastUpdated).getTime();
          break;
        default:
          aValue = a.effectiveness;
          bValue = b.effectiveness;
      }
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  };

  const filterSources = (sources: RAGKnowledgeSourceExtended[]) => {
    let filtered = sources;
    
    if (!currentShowInactive) {
      filtered = filtered.filter(s => s.isActive);
    }
    
    switch (filterBy) {
      case 'high':
        return filtered.filter(s => s.effectiveness >= 0.8);
      case 'medium':
        return filtered.filter(s => s.effectiveness >= 0.5 && s.effectiveness < 0.8);
      case 'low':
        return filtered.filter(s => s.effectiveness < 0.5);
      default:
        return filtered;
    }
  };

  const filteredAndSortedSources = sortSources(filterSources(liveSources));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <SourceEffectivenessHeader
        sourceCount={filteredAndSortedSources.length}
        isConnected={isConnected}
      />
      
      <SourceEffectivenessControls
        sortBy={currentSortBy}
        sortOrder={sortOrder}
        filterBy={filterBy}
        showInactive={currentShowInactive}
        onSortByChange={(value) => setSortBy(value as any)}
        onSortOrderChange={setSortOrder}
        onFilterByChange={setFilterBy}
        onShowInactiveChange={setShowInactive}
      />
      
      <SourceEffectivenessGrid
        sources={filteredAndSortedSources}
        selectedSource={selectedSource}
        onSourceSelect={setSelectedSource}
        filterBy={filterBy}
      />
    </div>
  );
};

export default RAGSourceEffectiveness;