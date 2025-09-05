import React from 'react';
import { RAGInsight } from '../../types/RAGTypes';

interface RAGEnhancementControlsProps {
  insights: RAGInsight[];
  showInsights: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

/**
 * RAG Enhancement Controls Component - Insights Summary and Controls
 * Focused on user interaction controls and insights display
 */
const RAGEnhancementControls: React.FC<RAGEnhancementControlsProps> = ({
  insights,
  showInsights,
  isExpanded,
  onToggleExpand,
}) => {
  return (
    <>
      {/* Header Controls */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">RAG Enhancement</h3>
          </div>
          <button
            onClick={onToggleExpand}
            className="p-1 rounded-md hover:bg-white hover:bg-opacity-50 transition-colors duration-200"
            aria-label={isExpanded ? 'Collapse RAG section' : 'Expand RAG section'}
          >
            <svg
              className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                isExpanded ? '' : 'rotate-180'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Insights Summary */}
      {insights.length > 0 && showInsights && (
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Recent RAG Insights ({insights.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {insights.slice(0, 3).map((insight) => (
              <div key={insight.id} className="text-xs text-gray-600">
                <span className="font-medium text-gray-900">{insight.agent}:</span>{' '}
                {insight.operation}
                {insight.confidence > 0 && (
                  <span className="ml-1 text-green-600">
                    ({(insight.confidence * 100).toFixed(0)}% confidence)
                  </span>
                )}
              </div>
            ))}
          </div>
          {insights.length > 3 && (
            <div className="text-xs text-gray-500 text-center mt-2">
              +{insights.length - 3} more insights available
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default RAGEnhancementControls;