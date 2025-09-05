import React, { useState } from 'react';
import { RAGToolInsightsProps, RAGToolInsight } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';

/**
 * RAG Tool Insights Component
 * Displays tool recommendation reasoning and context-aware suggestions
 */
const RAGToolInsights: React.FC<RAGToolInsightsProps> = ({
  investigationId,
  toolInsights = [],
  showAlternatives = true,
}) => {
  const [liveInsights, setLiveInsights] = useState<RAGToolInsight[]>(toolInsights);
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'confidence' | 'effectiveness' | 'recent'>('confidence');

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onRAGEvent: (event) => {
      if (event.type === 'rag_tool_recommendation') {
        const newInsight: RAGToolInsight = {
          id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          toolName: event.data.recommended_tool || 'Unknown Tool',
          recommendation: event.data.recommendation || 'Tool recommended for current context',
          reasoning: event.data.reasoning || 'Based on current investigation context',
          confidence: event.data.confidence_score || 0.8,
          alternatives: event.data.alternatives || [],
          contextFactors: event.data.context_factors || [],
          effectiveness: event.data.effectiveness_score || 0.75,
          usageHistory: [],
        };
        setLiveInsights(prev => [newInsight, ...prev].slice(0, 50)); // Keep last 50
      }
    },
  });

  const sortedInsights = [...liveInsights].sort((a, b) => {
    switch (sortBy) {
      case 'effectiveness':
        return b.effectiveness - a.effectiveness;
      case 'recent':
        return new Date(b.usageHistory[0]?.timestamp || '').getTime() - 
               new Date(a.usageHistory[0]?.timestamp || '').getTime();
      case 'confidence':
      default:
        return b.confidence - a.confidence;
    }
  });


  const renderInsightCard = (insight: RAGToolInsight) => {
    const isSelected = selectedInsight === insight.id;
    
    return (
      <div key={insight.id}>
        <RAGToolInsightCard
          insight={insight}
          isSelected={isSelected}
          onSelect={setSelectedInsight}
          showAlternatives={showAlternatives}
        />
        {isSelected && <RAGToolInsightDetails insight={insight} />}
      </div>
    );
  };

    
    return (
      <div 
        key={insight.id}
        className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
          isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
        onClick={() => setSelectedInsight(isSelected ? null : insight.id)}
      >
        {/* Tool Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getToolIcon(insight.toolName)}</span>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{insight.toolName}</h4>
              <p className="text-xs text-gray-500">
                Recommended • {getEffectivenessLevel(insight.effectiveness)} effectiveness
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              getConfidenceColor(insight.confidence)
            }`}>
              {(insight.confidence * 100).toFixed(0)}%
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              insight.effectiveness >= 0.7 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {getEffectivenessLevel(insight.effectiveness)}
            </span>
          </div>
        </div>

        {/* Recommendation Summary */}
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-gray-700 mb-1">Recommendation</h5>
          <p className="text-sm text-gray-800">{insight.recommendation}</p>
        </div>

        {/* Confidence and Effectiveness Bars */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Confidence</span>
              <span>{(insight.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  insight.confidence >= 0.8 ? 'bg-green-500' :
                  insight.confidence >= 0.6 ? 'bg-blue-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${insight.confidence * 100}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Effectiveness</span>
              <span>{(insight.effectiveness * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${insight.effectiveness * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Context Factors Preview */}
        {insight.contextFactors.length > 0 && (
          <div className="mb-3">
            <h5 className="text-xs font-semibold text-gray-700 mb-1">Key Factors</h5>
            <div className="flex flex-wrap gap-1">
              {insight.contextFactors.slice(0, 3).map((factor, idx) => (
                <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {factor}
                </span>
              ))}
              {insight.contextFactors.length > 3 && (
                <span className="text-xs text-gray-500">+{insight.contextFactors.length - 3} more</span>
              )}
            </div>
          </div>
        )}

        {/* Recent Usage */}
        {recent.length > 0 && (
          <div className="mb-3 bg-gray-50 rounded-lg p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700">Recent Usage</span>
              <span className={`px-2 py-1 rounded text-xs ${
                successRate >= 80 ? 'bg-green-100 text-green-800' :
                successRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {successRate.toFixed(0)}% success
              </span>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isSelected && (
          <div className="border-t border-gray-200 pt-3 space-y-4">
            {/* Detailed Reasoning */}
            <div>
              <h5 className="text-xs font-semibold text-gray-700 mb-2">Detailed Reasoning</h5>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{insight.reasoning}</p>
            </div>

            {/* All Context Factors */}
            {insight.contextFactors.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-2">
                  Context Factors ({insight.contextFactors.length})
                </h5>
                <div className="flex flex-wrap gap-1">
                  {insight.contextFactors.map((factor, idx) => (
                    <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Alternatives */}
            {showAlternatives && insight.alternatives.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-2">
                  Alternative Tools ({insight.alternatives.length})
                </h5>
                <div className="space-y-2">
                  {insight.alternatives.slice(0, 3).map((alt, idx) => (
                    <div key={idx} className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getToolIcon(alt)}</span>
                        <span className="text-xs font-medium text-yellow-800">{alt}</span>
                      </div>
                    </div>
                  ))}
                  {insight.alternatives.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{insight.alternatives.length - 3} more alternatives available
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Usage History */}
            {insight.usageHistory.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-2">
                  Usage History ({insight.usageHistory.length})
                </h5>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {insight.usageHistory.slice(0, 5).map((usage, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 rounded p-2">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          usage.success ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        <span className="text-gray-700">{usage.context}</span>
                      </div>
                      <span className="text-gray-500">
                        {new Date(usage.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            <div className="bg-green-50 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-green-800 mb-2">
                📊 Performance Summary
              </h5>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-green-700">Confidence:</span>
                  <span className="ml-2 font-medium text-green-900">
                    {(insight.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-green-700">Effectiveness:</span>
                  <span className="ml-2 font-medium text-green-900">
                    {(insight.effectiveness * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-green-700">Usage Count:</span>
                  <span className="ml-2 font-medium text-green-900">
                    {insight.usageHistory.length}
                  </span>
                </div>
                <div>
                  <span className="text-green-700">Success Rate:</span>
                  <span className="ml-2 font-medium text-green-900">
                    {successRate.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tool Insights</h3>
            <p className="text-sm text-gray-500">
              {liveInsights.length} tool recommendations • Context-aware suggestions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="confidence">By Confidence</option>
              <option value="effectiveness">By Effectiveness</option>
              <option value="recent">Most Recent</option>
            </select>
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

      {/* Tool Insights */}
      <div className="p-6">
        {sortedInsights.length > 0 ? (
          <div className="space-y-4">
            {sortedInsights.map(renderInsightCard)}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔧</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Tool Insights Available</h4>
            <p className="text-sm text-gray-500">
              Tool recommendations and insights will appear here as the investigation progresses.
            </p>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {liveInsights.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{liveInsights.length}</div>
              <div className="text-xs text-gray-500">Total Insights</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {liveInsights.filter(i => i.confidence >= 0.8).length}
              </div>
              <div className="text-xs text-gray-500">High Confidence</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {liveInsights.filter(i => i.alternatives.length > 0).length}
              </div>
              <div className="text-xs text-gray-500">With Alternatives</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {(liveInsights.reduce((sum, i) => sum + i.effectiveness, 0) / liveInsights.length * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">Avg Effectiveness</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGToolInsights;