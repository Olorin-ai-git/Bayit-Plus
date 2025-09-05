import React from 'react';
import { RAGToolInsight } from '../../../types/RAGTypes';

interface RAGToolInsightDetailsProps {
  insight: RAGToolInsight;
}

const RAGToolInsightDetails: React.FC<RAGToolInsightDetailsProps> = ({ insight }) => {
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

  return (
    <div className="border-t border-gray-200 pt-3 space-y-4">
      {/* Detailed Usage History */}
      {insight.usageHistory.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-gray-700 mb-2">Complete Usage History</h5>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {insight.usageHistory.map((usage, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded">
                <div className="flex items-center space-x-2">
                  <span className={usage.success ? 'text-green-600' : 'text-red-600'}>
                    {usage.success ? '✓' : '✗'}
                  </span>
                  <span className="text-gray-700">{new Date(usage.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-gray-500 text-right">
                  <div>{usage.context}</div>
                  {usage.duration && <div>({usage.duration}ms)</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Context Factors */}
      {insight.contextFactors.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-gray-700 mb-2">All Context Factors</h5>
          <div className="grid grid-cols-2 gap-2">
            {insight.contextFactors.map((factor, idx) => (
              <div key={idx} className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded">
                {factor}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Alternatives */}
      {insight.alternatives.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-gray-700 mb-2">Alternative Tools</h5>
          <div className="space-y-2">
            {insight.alternatives.map((alt, idx) => (
              <div key={idx} className="flex items-center space-x-2 text-xs bg-gray-50 p-2 rounded">
                <span className="text-lg">{getToolIcon(alt)}</span>
                <span className="text-gray-700">{alt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="bg-green-50 rounded-lg p-3">
        <h5 className="text-xs font-semibold text-green-800 mb-2">
          📊 Performance Analysis
        </h5>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-green-700">Confidence Score:</span>
            <span className="ml-2 font-medium">{(insight.confidence * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-green-700">Effectiveness:</span>
            <span className="ml-2 font-medium">{(insight.effectiveness * 100).toFixed(1)}%</span>
          </div>
          {insight.usageHistory.length > 0 && (
            <>
              <div>
                <span className="text-green-700">Success Rate:</span>
                <span className="ml-2 font-medium">
                  {((insight.usageHistory.filter(h => h.success).length / insight.usageHistory.length) * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-green-700">Total Uses:</span>
                <span className="ml-2 font-medium">{insight.usageHistory.length}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RAGToolInsightDetails;