import React, { useState } from 'react';
import { RAGToolAlternativesProps, RAGToolAlternative } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';
import RAGAlternativeCard from './RAGAlternativeCard';
import RAGAlternativeComparison from './RAGAlternativeComparison';

/**
 * RAG Tool Alternatives Component
 * Shows alternative tools considered and their comparative analysis
 */
const RAGToolAlternatives: React.FC<RAGToolAlternativesProps> = ({
  investigationId,
  primaryTool,
  alternatives = [],
  onAlternativeSelect,
}) => {
  const [liveAlternatives, setLiveAlternatives] = useState<RAGToolAlternative[]>(alternatives);
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  const [comparisonView, setComparisonView] = useState<'list' | 'comparison' | 'detailed'>('list');

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onRAGEvent: (event) => {
      if (event.type === 'rag_tool_alternatives' && event.data.alternatives) {
        const newAlternatives: RAGToolAlternative[] = event.data.alternatives.map((alt: any) => ({
          name: alt.name,
          confidence: alt.confidence || 0.7,
          reasoning: alt.reasoning || 'Alternative tool option',
          pros: alt.pros || [],
          cons: alt.cons || [],
          suitabilityScore: alt.suitability_score || 0.6,
        }));
        setLiveAlternatives(newAlternatives);
      }
    },
  });

  const sortedAlternatives = [...liveAlternatives].sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  const handleAlternativeClick = (alternative: RAGToolAlternative) => {
    setSelectedAlternative(selectedAlternative === alternative.name ? null : alternative.name);
    onAlternativeSelect?.(alternative);
  };


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tool Alternatives</h3>
            <p className="text-sm text-gray-500">
              Primary: {primaryTool} • {liveAlternatives.length} alternatives considered
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 border rounded-md">
              {['list', 'comparison', 'detailed'].map((view) => (
                <button
                  key={view}
                  onClick={() => setComparisonView(view as any)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    comparisonView === view 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {view === 'list' && '🗺️'}
                  {view === 'comparison' && '📉'}
                  {view === 'detailed' && '🔍'}
                  <span className="ml-1 capitalize">{view}</span>
                </button>
              ))}
            </div>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span>{isConnected ? 'Live' : 'Static'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {liveAlternatives.length > 0 ? (
          <div>
            {comparisonView === 'comparison' ? (
              <RAGAlternativeComparison alternatives={liveAlternatives} primaryTool={primaryTool} />
            ) : (
              <div className="space-y-4">
                {sortedAlternatives.map((alt, index) => (
                  <RAGAlternativeCard
                    key={alt.name}
                    alternative={alt}
                    index={index}
                    selectedAlternative={selectedAlternative}
                    primaryTool={primaryTool}
                    onAlternativeClick={handleAlternativeClick}
                    onAlternativeSelect={onAlternativeSelect}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔄</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Alternatives Available</h4>
            <p className="text-sm text-gray-500">
              Alternative tool options will appear here when available for comparison.
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      {liveAlternatives.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{liveAlternatives.length}</div>
              <div className="text-xs text-gray-500">Alternatives</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {liveAlternatives.filter(a => a.suitabilityScore >= 0.7).length}
              </div>
              <div className="text-xs text-gray-500">Highly Suitable</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {(liveAlternatives.reduce((sum, a) => sum + a.confidence, 0) / liveAlternatives.length * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">Avg Confidence</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {sortedAlternatives[0]?.name.split('_')[0] || 'N/A'}
              </div>
              <div className="text-xs text-gray-500">Top Alternative</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGToolAlternatives;