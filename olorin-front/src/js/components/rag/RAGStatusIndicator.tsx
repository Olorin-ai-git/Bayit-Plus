import React from 'react';
import { RAGStatusIndicatorProps } from '../../types/RAGTypes';

/**
 * RAG Status Indicator Component
 * Displays real-time RAG enhancement status with visual indicators
 */
const RAGStatusIndicator: React.FC<RAGStatusIndicatorProps> = ({
  isRAGEnabled,
  currentOperation = '',
  confidence = 0,
  processingState = 'idle',
  className = '',
  onToggleInsights,
}) => {
  // Status indicator styling based on processing state
  const getStatusStyles = () => {
    if (!isRAGEnabled) {
      return 'bg-gray-100 border-gray-300 text-gray-500';
    }
    
    switch (processingState) {
      case 'retrieving':
        return 'bg-blue-50 border-blue-300 text-blue-700 animate-pulse';
      case 'augmenting':
        return 'bg-purple-50 border-purple-300 text-purple-700';
      case 'recommending':
        return 'bg-yellow-50 border-yellow-300 text-yellow-700';
      case 'enhancing':
        return 'bg-green-50 border-green-300 text-green-700';
      default:
        return 'bg-emerald-50 border-emerald-300 text-emerald-700';
    }
  };

  // Processing state icon
  const getStatusIcon = () => {
    if (!isRAGEnabled) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
        </svg>
      );
    }

    switch (processingState) {
      case 'retrieving':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'augmenting':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'recommending':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'enhancing':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Processing state labels
  const getStatusLabel = () => {
    if (!isRAGEnabled) {
      return 'RAG Disabled';
    }
    
    switch (processingState) {
      case 'retrieving':
        return 'Retrieving Knowledge';
      case 'augmenting':
        return 'Augmenting Context';
      case 'recommending':
        return 'Recommending Tools';
      case 'enhancing':
        return 'Enhancing Results';
      default:
        return 'RAG Enhanced';
    }
  };

  // Confidence indicator
  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    if (confidence >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div 
      className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border-2 transition-all duration-300 ${getStatusStyles()} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`RAG Status: ${getStatusLabel()}`}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>

      {/* Status Text */}
      <div className="flex flex-col">
        <span className="text-sm font-semibold">
          {getStatusLabel()}
        </span>
        {currentOperation && (
          <span className="text-xs opacity-75">
            {currentOperation}
          </span>
        )}
      </div>

      {/* Confidence Indicator */}
      {isRAGEnabled && confidence > 0 && (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-gray-300">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${getConfidenceColor()}`}
              style={{ width: `${confidence * 100}%` }}
              title={`Confidence: ${(confidence * 100).toFixed(1)}%`}
            />
          </div>
          <span className="text-xs opacity-75">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {/* Insights Toggle */}
      {onToggleInsights && (
        <button
          onClick={onToggleInsights}
          className="flex-shrink-0 p-1 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors duration-200"
          title="View RAG Insights"
          aria-label="View RAG Insights"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default RAGStatusIndicator;
