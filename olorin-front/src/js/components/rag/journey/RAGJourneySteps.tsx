import React, { useState } from 'react';
import { RAGJourneyStepsProps, RAGJourneyStep } from '../../../types/RAGTypes';

/**
 * RAG Journey Steps Component
 * Displays individual enhancement steps with detailed breakdowns
 */
const RAGJourneySteps: React.FC<RAGJourneyStepsProps> = ({
  steps,
  currentStepIndex = -1,
  onStepSelect,
  showStepDetails = true,
  groupByAgent = false,
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'chronological' | 'confidence' | 'agent'>('chronological');
  const [currentGroupByAgent, setGroupByAgent] = useState(groupByAgent);

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const sortedSteps = [...steps].sort((a, b) => {
    switch (sortOrder) {
      case 'confidence':
        return (b.ragEnhancement?.confidence || 0) - (a.ragEnhancement?.confidence || 0);
      case 'agent':
        return a.agent.localeCompare(b.agent);
      case 'chronological':
      default:
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
  });

  const groupedSteps = currentGroupByAgent 
    ? sortedSteps.reduce((groups, step) => {
        const agent = step.agent;
        if (!groups[agent]) groups[agent] = [];
        groups[agent].push(step);
        return groups;
      }, {} as Record<string, RAGJourneyStep[]>)
    : { 'All Steps': sortedSteps };

  const getStepProgressPercentage = (stepIndex: number, totalSteps: number) => {
    if (currentStepIndex < 0) return 0;
    return Math.min(100, (stepIndex / Math.max(1, totalSteps - 1)) * 100);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStepTypeDescription = (step: RAGJourneyStep) => {
    const ragType = step.ragEnhancement?.type || 'unknown';
    const descriptions: Record<string, string> = {
      'rag_query_enhancement': 'Query was enhanced using knowledge base',
      'rag_knowledge_retrieval': 'Relevant knowledge was retrieved',
      'rag_tool_selection': 'Tools were selected based on context',
      'rag_response_generation': 'Response was generated with RAG support',
      'rag_validation': 'Results were validated against knowledge',
      'rag_context_analysis': 'Context was analyzed for relevance',
    };
    return descriptions[ragType] || 'RAG enhancement was applied';
  };

  const renderStepCard = (step: RAGJourneyStep, index: number, isInGroup: boolean = false) => {
    const isExpanded = expandedSteps.has(step.id);
    const isCurrent = index === currentStepIndex;
    const isCompleted = index < currentStepIndex;
    const progressPercentage = getStepProgressPercentage(index, steps.length);

    return (
      <div 
        key={step.id} 
        className={`border rounded-lg transition-all duration-200 ${
          isCurrent ? 'border-indigo-500 bg-indigo-50 shadow-md' :
          isCompleted ? 'border-green-300 bg-green-50' :
          'border-gray-200 bg-white hover:border-gray-300'
        } ${isInGroup ? 'ml-4' : ''}`}
      >
        {/* Step Header */}
        <div 
          className="px-4 py-3 cursor-pointer"
          onClick={() => {
            toggleStepExpansion(step.id);
            onStepSelect?.(step, index);
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Step Number/Icon */}
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                isCurrent ? 'bg-indigo-600 text-white' :
                isCompleted ? 'bg-green-600 text-white' :
                'bg-gray-300 text-gray-600'
              }`}>
                {isCompleted ? '✓' : step.stepNumber}
              </div>
              
              {/* Step Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900">{step.title}</h4>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-xs text-gray-600">🤖 {step.agent}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </span>
                  {step.duration > 0 && (
                    <span className="text-xs text-gray-500">
                      ⏱️ {formatDuration(step.duration)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center space-x-2">
              {step.ragEnhancement?.applied && (
                <div className="flex items-center space-x-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    getConfidenceColor(step.ragEnhancement.confidence)
                  }`}>
                    {(step.ragEnhancement.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-purple-600" title="RAG Enhanced">🤖</span>
                </div>
              )}
              
              <span className={`transition-transform duration-200 text-gray-400 ${
                isExpanded ? 'rotate-180' : ''
              }`}>
                ▼
              </span>
            </div>
          </div>
          
          {/* Progress Bar */}
          {currentStepIndex >= 0 && (
            <div className="mt-3 bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isCurrent ? 'bg-indigo-600' :
                  isCompleted ? 'bg-green-600' :
                  'bg-gray-300'
                }`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Expanded Content */}
        {isExpanded && showStepDetails && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="pt-4 space-y-4">
              {/* Description */}
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-2">Description</h5>
                <p className="text-sm text-gray-700">{step.description}</p>
              </div>
              
              {/* RAG Enhancement Details */}
              {step.ragEnhancement?.applied && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-purple-900 mb-2">
                    🤖 RAG Enhancement Details
                  </h5>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-purple-800">Type:</span>
                      <span className="ml-2 text-xs text-purple-700">
                        {step.ragEnhancement.type.replace('rag_', '').replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-purple-800">How it helped:</span>
                      <p className="text-xs text-purple-700 mt-1">
                        {getStepTypeDescription(step)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-purple-800">Reasoning:</span>
                      <p className="text-xs text-purple-700 mt-1">
                        {step.ragEnhancement.reasoning}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-purple-800">Confidence Level:</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          getConfidenceColor(step.ragEnhancement.confidence)
                        }`}>
                          {(step.ragEnhancement.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              step.ragEnhancement.confidence >= 0.8 ? 'bg-green-500' :
                              step.ragEnhancement.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${step.ragEnhancement.confidence * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Knowledge Sources */}
              {step.ragEnhancement?.sources && step.ragEnhancement.sources.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    📚 Knowledge Sources ({step.ragEnhancement.sources.length})
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {step.ragEnhancement.sources.map((source, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 cursor-pointer"
                        title={`Knowledge source: ${source}`}
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Tools Used */}
              {step.tools.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    🔧 Tools Used ({step.tools.length})
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {step.tools.map((tool, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Key Insights */}
              {step.insights.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    💡 Key Insights
                  </h5>
                  <ul className="text-xs text-gray-700 space-y-1">
                    {step.insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-yellow-500 mr-2">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (steps.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Steps Available</h3>
          <p className="text-sm text-gray-500">
            Investigation steps will appear here as they are completed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Investigation Steps</h3>
            <p className="text-sm text-gray-500">
              {steps.length} steps • {steps.filter(s => s.ragEnhancement?.applied).length} RAG enhanced
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="chronological">Chronological</option>
              <option value="confidence">By Confidence</option>
              <option value="agent">By Agent</option>
            </select>
            <label className="flex items-center text-sm text-gray-600">
              <input 
                type="checkbox" 
                checked={currentGroupByAgent}
                onChange={(e) => setGroupByAgent(e.target.checked)}
                className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Group by Agent
            </label>
          </div>
        </div>
      </div>

      {/* Steps Content */}
      <div className="p-6">
        <div className="space-y-4">
          {Object.entries(groupedSteps).map(([groupName, groupSteps]) => (
            <div key={groupName}>
              {currentGroupByAgent && (
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  🤖 {groupName} ({groupSteps.length} steps)
                </h4>
              )}
              <div className="space-y-3">
                {groupSteps.map((step, index) => 
                  renderStepCard(step, sortedSteps.indexOf(step), currentGroupByAgent)
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RAGJourneySteps;