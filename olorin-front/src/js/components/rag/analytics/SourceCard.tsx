import React from 'react';
import { RAGKnowledgeSourceExtended } from '../../../types/RAGTypes';
import SourceMetrics from './SourceMetrics';
import SourceDetails from './SourceDetails';

interface SourceCardProps {
  source: RAGKnowledgeSourceExtended;
  isSelected: boolean;
  onSelect: (sourceId: string | null) => void;
  maxUsageCount: number;
}

const SourceCard: React.FC<SourceCardProps> = ({
  source,
  isSelected,
  onSelect,
  maxUsageCount,
}) => {
  const getSourceTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'documentation': '📚',
      'database': '💾',
      'api': '🔗',
      'file': '📄',
      'web': '🌐',
      'manual': '✍️',
      'automated': '🤖',
    };
    return icons[type.toLowerCase()] || '📄';
  };

  const getEffectivenessColor = (effectiveness: number) => {
    if (effectiveness >= 0.8) return 'text-green-600 bg-green-100 border-green-200';
    if (effectiveness >= 0.5) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getEffectivenessLevel = (effectiveness: number) => {
    if (effectiveness >= 0.8) return 'High';
    if (effectiveness >= 0.5) return 'Medium';
    return 'Low';
  };

  const getFreshnessScore = (lastUpdated: string) => {
    const daysSinceUpdate = Math.floor(
      (new Date().getTime() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceUpdate <= 7) return 1.0;
    if (daysSinceUpdate <= 30) return 0.8;
    if (daysSinceUpdate <= 90) return 0.6;
    if (daysSinceUpdate <= 180) return 0.4;
    return 0.2;
  };

  const freshnessScore = getFreshnessScore(source.lastUpdated);

  return (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
        isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={() => onSelect(isSelected ? null : source.id)}
    >
      {/* Source Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getSourceTypeIcon(source.type)}</span>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{source.name}</h4>
            <p className="text-xs text-gray-500">{source.type} • {source.category}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            getEffectivenessColor(source.effectiveness)
          }`}>
            {getEffectivenessLevel(source.effectiveness)}
          </span>
          {!source.isActive && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <SourceMetrics 
        source={source}
        freshnessScore={freshnessScore}
        maxUsageCount={maxUsageCount}
      />

      {/* Expanded Details */}
      {isSelected && (
        <SourceDetails 
          source={source}
          freshnessScore={freshnessScore}
        />
      )}
    </div>
  );
};

export default SourceCard;