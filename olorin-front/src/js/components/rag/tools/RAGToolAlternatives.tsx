import React, { useState } from 'react';
import { RAGToolAlternativesProps, RAGToolAlternative } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';

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

  const getToolIcon = (toolName: string) => {
    const toolIcons: Record<string, string> = {
      'splunk_search': '🔍',
      'risk_calculator': '📈',
      'device_analyzer': '📱',
      'geo_validator': '🌍',
      'fraud_detector': '🕵️',
      'network_analyzer': '🌐',
      'behavioral_model': '🧠',
      'identity_checker': '🆔',
    };
    return toolIcons[toolName.toLowerCase().replace(' ', '_')] || '🔧';
  };

  const getSuitabilityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100 border-green-200';
    if (score >= 0.6) return 'text-blue-600 bg-blue-100 border-blue-200';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getSuitabilityLevel = (score: number) => {
    if (score >= 0.8) return 'Highly Suitable';
    if (score >= 0.6) return 'Suitable';
    if (score >= 0.4) return 'Moderately Suitable';
    return 'Less Suitable';
  };

  const handleAlternativeClick = (alternative: RAGToolAlternative) => {
    setSelectedAlternative(selectedAlternative === alternative.name ? null : alternative.name);
    onAlternativeSelect?.(alternative);
  };

  const renderAlternativeCard = (alternative: RAGToolAlternative, index: number) => {
    const isSelected = selectedAlternative === alternative.name;
    const isPrimary = alternative.name === primaryTool;
    
    return (
      <div 
        key={alternative.name}
        className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
          isPrimary ? 'border-indigo-500 bg-indigo-50' :
          isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : 
          'border-gray-200 hover:border-gray-300 bg-white'
        }`}
        onClick={() => !isPrimary && handleAlternativeClick(alternative)}
      >
        {/* Alternative Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getToolIcon(alternative.name)}</span>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                {alternative.name}
                {isPrimary && (
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                    Primary
                  </span>
                )}
              </h4>
              <p className="text-xs text-gray-500">
                Rank #{index + 1} • {getSuitabilityLevel(alternative.suitabilityScore)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              getSuitabilityColor(alternative.suitabilityScore)
            }`}>
              {(alternative.suitabilityScore * 100).toFixed(0)}%
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              alternative.confidence >= 0.8 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {(alternative.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        </div>

        {/* Suitability Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Suitability Score</span>
            <span>{(alternative.suitabilityScore * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                alternative.suitabilityScore >= 0.8 ? 'bg-green-500' :
                alternative.suitabilityScore >= 0.6 ? 'bg-blue-500' :
                alternative.suitabilityScore >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${alternative.suitabilityScore * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Quick Pros/Cons */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <h5 className="text-xs font-semibold text-green-700 mb-1">✓ Pros</h5>
            <div className="text-xs text-green-800 space-y-1">
              {alternative.pros.slice(0, 2).map((pro, idx) => (
                <div key={idx} className="flex items-start">
                  <span className="text-green-500 mr-1">•</span>
                  <span>{pro}</span>
                </div>
              ))}
              {alternative.pros.length > 2 && (
                <span className="text-green-600">+{alternative.pros.length - 2} more</span>
              )}
            </div>
          </div>
          <div>
            <h5 className="text-xs font-semibold text-red-700 mb-1">✗ Cons</h5>
            <div className="text-xs text-red-800 space-y-1">
              {alternative.cons.slice(0, 2).map((con, idx) => (
                <div key={idx} className="flex items-start">
                  <span className="text-red-500 mr-1">•</span>
                  <span>{con}</span>
                </div>
              ))}
              {alternative.cons.length > 2 && (
                <span className="text-red-600">+{alternative.cons.length - 2} more</span>
              )}
            </div>
          </div>
        </div>

        {/* Reasoning Preview */}
        <div className="mb-3">
          <p className="text-xs text-gray-700 bg-gray-50 rounded p-2">
            {alternative.reasoning}
          </p>
        </div>

        {/* Expanded Details */}
        {isSelected && !isPrimary && (
          <div className="border-t border-gray-200 pt-3 space-y-4">
            {/* Complete Pros List */}
            {alternative.pros.length > 0 && (
              <div className="bg-green-50 rounded-lg p-3">
                <h5 className="text-sm font-semibold text-green-800 mb-2">
                  ✓ Advantages ({alternative.pros.length})
                </h5>
                <ul className="text-xs text-green-700 space-y-1">
                  {alternative.pros.map((pro, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-green-500 mr-2 mt-0.5">✓</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Complete Cons List */}
            {alternative.cons.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <h5 className="text-sm font-semibold text-red-800 mb-2">
                  ✗ Disadvantages ({alternative.cons.length})
                </h5>
                <ul className="text-xs text-red-700 space-y-1">
                  {alternative.cons.map((con, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-red-500 mr-2 mt-0.5">✗</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Analysis */}
            <div className="bg-blue-50 rounded-lg p-3">
              <h5 className="text-sm font-semibold text-blue-800 mb-2">
                📊 Detailed Analysis
              </h5>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-blue-700">Confidence Level:</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex-1 bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${alternative.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-medium text-blue-900">
                      {(alternative.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-blue-700">Suitability:</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex-1 bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${alternative.suitabilityScore * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-medium text-blue-900">
                      {(alternative.suitabilityScore * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAlternativeSelect?.(alternative);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                Consider This Alternative
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderComparisonView = () => {
    const metrics = ['suitabilityScore', 'confidence'];
    const maxValues = {
      suitabilityScore: Math.max(...liveAlternatives.map(a => a.suitabilityScore)),
      confidence: Math.max(...liveAlternatives.map(a => a.confidence)),
    };

    return (
      <div className="space-y-4">
        {metrics.map(metric => (
          <div key={metric} className="bg-white border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 capitalize">
              {metric === 'suitabilityScore' ? 'Suitability Score' : 'Confidence Level'} Comparison
            </h4>
            <div className="space-y-3">
              {sortedAlternatives.map((alt, index) => {
                const value = alt[metric as keyof RAGToolAlternative] as number;
                const barWidth = (value / maxValues[metric as keyof typeof maxValues]) * 100;
                const isPrimary = alt.name === primaryTool;
                
                return (
                  <div key={alt.name} className="flex items-center space-x-3">
                    <div className="w-24 text-xs font-medium text-gray-700 truncate">
                      {alt.name}
                    </div>
                    <div className="flex-1 relative">
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className={`h-4 rounded-full flex items-center px-2 text-white text-xs font-medium ${
                            isPrimary ? 'bg-indigo-600' :
                            value >= 0.8 ? 'bg-green-500' :
                            value >= 0.6 ? 'bg-blue-500' :
                            value >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.max(15, barWidth)}%` }}
                        >
                          {barWidth > 20 && `${(value * 100).toFixed(0)}%`}
                        </div>
                      </div>
                      {isPrimary && (
                        <span className="absolute -top-6 left-0 text-xs text-indigo-600 font-medium">
                          Primary Tool
                        </span>
                      )}
                    </div>
                    <div className="w-16 text-xs text-gray-600">
                      {(value * 100).toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
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
            {comparisonView === 'comparison' ? renderComparisonView() : (
              <div className="space-y-4">
                {sortedAlternatives.map((alt, index) => renderAlternativeCard(alt, index))}
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