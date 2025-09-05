import React from 'react';
import { RAGKnowledgeSourceExtended } from '../../../types/RAGTypes';
import SourceCard from './SourceCard';

interface SourceEffectivenessGridProps {
  sources: RAGKnowledgeSourceExtended[];
  selectedSource: string | null;
  onSourceSelect: (sourceId: string | null) => void;
  filterBy: string;
}

const SourceEffectivenessGrid: React.FC<SourceEffectivenessGridProps> = ({
  sources,
  selectedSource,
  onSourceSelect,
  filterBy,
}) => {
  const maxUsageCount = Math.max(...sources.map(s => s.usageCount), 1);

  if (sources.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📚</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Sources Found</h4>
          <p className="text-sm text-gray-500">
            {filterBy !== 'all' ? 'Try adjusting your filter criteria.' : 'No knowledge sources are currently available.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sources.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            isSelected={selectedSource === source.id}
            onSelect={onSourceSelect}
            maxUsageCount={maxUsageCount}
          />
        ))}
      </div>
    </div>
  );
};

export default SourceEffectivenessGrid;