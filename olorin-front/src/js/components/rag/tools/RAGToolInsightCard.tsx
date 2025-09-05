import React from 'react';
import { RAGToolInsight } from '../../../types/RAGTypes';

interface RAGToolInsightCardProps {
  insight: RAGToolInsight;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  showAlternatives: boolean;
}

const RAGToolInsightCard: React.FC<RAGToolInsightCardProps> = ({
  insight,
  isSelected,
  onSelect,
  showAlternatives,
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100 border-green-200';
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-100 border-blue-200';
    return 'text-yellow-600 bg-yellow-100 border-yellow-200';
  };

  const getEffectivenessLevel = (effectiveness: number) => {
    if (effectiveness >= 0.8) return 'Excellent';
    if (effectiveness >= 0.6) return 'Good';
    if (effectiveness >= 0.4) return 'Fair';
    return 'Poor';
  };

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

  const formatUsageHistory = (history: RAGToolInsight['usageHistory']) => {
    const recent = history.slice(0, 5);
    const successRate = recent.length > 0 
      ? (recent.filter(h => h.success).length / recent.length) * 100 
      : 0;
    return { recent, successRate };
  };

  const { recent, successRate } = formatUsageHistory(insight.usageHistory);

  return (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
        isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={() => onSelect(isSelected ? null : insight.id)}
    >
      {/* Tool Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getToolIcon(insight.toolName)}</span>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{insight.toolName}</h4>
            <p className="text-xs text-gray-500">{getEffectivenessLevel(insight.effectiveness)} effectiveness</p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            getConfidenceColor(insight.confidence)
          }`}>
            {(insight.confidence * 100).toFixed(0)}% confidence
          </span>
          {recent.length > 0 && (
            <span className="text-xs text-gray-500">
              {successRate.toFixed(0)}% success rate
            </span>
          )}
        </div>
      </div>

      {/* Recommendation */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 mb-2">{insight.recommendation}</p>
        <div className="text-xs text-gray-500">
          <strong>Reasoning:</strong> {insight.reasoning}
        </div>
      </div>

      {/* Context Factors */}
      {insight.contextFactors.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-gray-700 mb-1">Context Factors</h5>
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

      {/* Usage History Preview */}
      {recent.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-gray-700 mb-1">Recent Usage</h5>
          <div className="space-y-1">
            {recent.slice(0, 2).map((usage, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className={usage.success ? 'text-green-600' : 'text-red-600'}>
                  {usage.success ? '✓' : '✗'} {new Date(usage.timestamp).toLocaleDateString()}
                </span>
                <span className="text-gray-500">{usage.context}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternatives Preview */}
      {showAlternatives && insight.alternatives.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-gray-700 mb-1">Alternative Tools</h5>
          <div className="flex flex-wrap gap-1">
            {insight.alternatives.slice(0, 2).map((alt, idx) => (
              <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {getToolIcon(alt)} {alt}
              </span>
            ))}
            {insight.alternatives.length > 2 && (
              <span className="text-xs text-gray-500">+{insight.alternatives.length - 2} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGToolInsightCard;