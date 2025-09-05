import React, { useState, useEffect } from 'react';
import { RAGJourneyViewerProps, RAGJourneyStep } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';

/**
 * RAG Journey Viewer Component
 * Visualizes step-by-step investigation progress with RAG enhancement points
 */
const RAGJourneyViewer: React.FC<RAGJourneyViewerProps> = ({
  investigationId,
  journeySteps = [],
  currentStep = 0,
  onStepSelect,
  showDetails = true,
}) => {
  const [liveSteps, setLiveSteps] = useState<RAGJourneyStep[]>(journeySteps);
  const [selectedStep, setSelectedStep] = useState<number>(currentStep);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([currentStep]));

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onRAGEvent: (event) => {
      // Convert RAG events to journey steps
      const newStep: RAGJourneyStep = {
        id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        stepNumber: liveSteps.length + 1,
        title: event.data.operation || event.type.replace('rag_', '').replace('_', ' '),
        description: event.data.description || `${event.agent_type} performed ${event.type}`,
        agent: event.agent_type,
        ragEnhancement: {
          applied: true,
          type: event.type,
          confidence: event.data.confidence_score || 0.8,
          sources: event.data.knowledge_sources || [],
          reasoning: event.data.reasoning || 'RAG enhancement applied',
        },
        timestamp: event.timestamp,
        status: 'completed',
        duration: event.data.processing_time || 0,
        tools: event.data.tools_used || [],
        insights: event.data.insights || [],
      };
      setLiveSteps(prev => [...prev, newStep]);
    },
  });

  const handleStepClick = (stepIndex: number) => {
    setSelectedStep(stepIndex);
    onStepSelect?.(stepIndex, liveSteps[stepIndex]);
    
    // Toggle expansion
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex);
    } else {
      newExpanded.add(stepIndex);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepStatusIcon = (step: RAGJourneyStep) => {
    switch (step.status) {
      case 'completed': return '✓';
      case 'in_progress': return '🔄';
      case 'pending': return '⏳';
      case 'failed': return '❌';
      default: return '•';
    }
  };

  const getStepStatusColor = (step: RAGJourneyStep) => {
    switch (step.status) {
      case 'completed': return 'bg-green-100 border-green-300 text-green-800';
      case 'in_progress': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'pending': return 'bg-gray-100 border-gray-300 text-gray-600';
      case 'failed': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  const getRagEnhancementBadge = (enhancement: RAGJourneyStep['ragEnhancement']) => {
    if (!enhancement?.applied) return null;
    
    const confidenceColor = enhancement.confidence >= 0.8 ? 'bg-green-500' : 
                            enhancement.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500';
    
    return (
      <div className="flex items-center space-x-2 mt-2">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          🤖 RAG Enhanced
        </span>
        <span className={`w-2 h-2 rounded-full ${confidenceColor}`} title={`Confidence: ${(enhancement.confidence * 100).toFixed(0)}%`}></span>
        <span className="text-xs text-gray-500">{enhancement.sources.length} sources</span>
      </div>
    );
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Investigation Journey</h3>
            <p className="text-sm text-gray-500">
              {liveSteps.length} steps • {liveSteps.filter(s => s.ragEnhancement?.applied).length} RAG enhanced
            </p>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            <span>{isConnected ? 'Live Updates' : 'Static'}</span>
          </div>
        </div>
      </div>

      {/* Journey Steps */}
      <div className="p-6">
        <div className="space-y-4">
          {liveSteps.map((step, index) => {
            const isExpanded = expandedSteps.has(index);
            const isSelected = selectedStep === index;
            
            return (
              <div 
                key={step.id} 
                className={`border rounded-lg transition-all duration-200 cursor-pointer ${
                  isSelected ? 'border-indigo-500 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                } ${getStepStatusColor(step)}`}
                onClick={() => handleStepClick(index)}
              >
                {/* Step Header */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-current">
                        <span className="text-sm font-semibold">{getStepStatusIcon(step)}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">
                          Step {step.stepNumber}: {step.title}
                        </h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-600">{step.agent}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                          {step.duration > 0 && (
                            <span className="text-xs text-gray-500">
                              {formatDuration(step.duration)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {step.ragEnhancement?.applied && (
                        <span className="text-purple-600" title="RAG Enhanced">🤖</span>
                      )}
                      <span className={`transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}>▼</span>
                    </div>
                  </div>
                  
                  {step.ragEnhancement && getRagEnhancementBadge(step.ragEnhancement)}
                </div>

                {/* Expanded Details */}
                {isExpanded && showDetails && (
                  <div className="px-4 pb-4 pt-2 border-t border-current border-opacity-20">
                    <p className="text-sm text-gray-700 mb-3">{step.description}</p>
                    
                    {/* Tools Used */}
                    {step.tools.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-xs font-semibold text-gray-600 mb-1">Tools Used:</h5>
                        <div className="flex flex-wrap gap-1">
                          {step.tools.map((tool, idx) => (
                            <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* RAG Enhancement Details */}
                    {step.ragEnhancement?.applied && (
                      <div className="mb-3 bg-purple-50 rounded-lg p-3">
                        <h5 className="text-xs font-semibold text-purple-900 mb-2">🤖 RAG Enhancement Details</h5>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-purple-800">Confidence:</span>
                            <span className="ml-2 text-xs text-purple-700">
                              {(step.ragEnhancement.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-purple-800">Reasoning:</span>
                            <p className="text-xs text-purple-700 mt-1">{step.ragEnhancement.reasoning}</p>
                          </div>
                          {step.ragEnhancement.sources.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-purple-800">Knowledge Sources:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {step.ragEnhancement.sources.slice(0, 5).map((source, idx) => (
                                  <span key={idx} className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
                                    {source}
                                  </span>
                                ))}
                                {step.ragEnhancement.sources.length > 5 && (
                                  <span className="text-xs text-purple-600">+{step.ragEnhancement.sources.length - 5} more</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Insights */}
                    {step.insights.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-gray-600 mb-1">Key Insights:</h5>
                        <ul className="text-xs text-gray-700 space-y-1">
                          {step.insights.map((insight, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {liveSteps.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🚾</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Journey Steps Yet</h4>
            <p className="text-sm text-gray-500">
              Journey steps will appear here as the investigation progresses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RAGJourneyViewer;