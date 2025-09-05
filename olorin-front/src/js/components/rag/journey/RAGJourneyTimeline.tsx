import React, { useState, useRef, useEffect } from 'react';
import { RAGJourneyTimelineProps, RAGJourneyStep } from '../../../types/RAGTypes';
import useRAGWebSocket from '../../../hooks/useRAGWebSocket';

/**
 * RAG Journey Timeline Component
 * Chronological visualization of investigation steps with RAG intervention highlights
 */
const RAGJourneyTimeline: React.FC<RAGJourneyTimelineProps> = ({
  investigationId,
  journeySteps = [],
  selectedStepId,
  onStepClick,
  showTimeLabels = true,
  compactMode = false,
}) => {
  const [liveSteps, setLiveSteps] = useState<RAGJourneyStep[]>(journeySteps);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const timelineRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Real-time updates via WebSocket
  const { isConnected } = useRAGWebSocket({
    investigationId,
    onRAGEvent: (event) => {
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
      
      setLiveSteps(prev => {
        const updated = [...prev, newStep];
        // Auto-scroll to show new steps
        if (autoScroll && timelineRef.current) {
          setTimeout(() => {
            timelineRef.current?.scrollTo({
              top: timelineRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }, 100);
        }
        return updated;
      });
    },
  });

  const getRelativeTimeLabel = (timestamp: string, index: number) => {
    if (index === 0) return 'Start';
    
    const current = new Date(timestamp);
    const previous = new Date(liveSteps[index - 1]?.timestamp || timestamp);
    const diff = current.getTime() - previous.getTime();
    
    if (diff < 60000) return `+${Math.round(diff / 1000)}s`;
    if (diff < 3600000) return `+${Math.round(diff / 60000)}m`;
    return `+${Math.round(diff / 3600000)}h`;
  };

  const getStepTypeIcon = (step: RAGJourneyStep) => {
    const ragType = step.ragEnhancement?.type || '';
    
    if (ragType.includes('query')) return '📝';
    if (ragType.includes('knowledge')) return '📚';
    if (ragType.includes('tool')) return '🔧';
    if (ragType.includes('analysis')) return '🔍';
    if (step.ragEnhancement?.applied) return '🤖';
    
    return '•';
  };

  const getStepSeverityColor = (step: RAGJourneyStep) => {
    if (step.status === 'failed') return 'bg-red-500';
    if (step.ragEnhancement?.applied) {
      const confidence = step.ragEnhancement.confidence;
      if (confidence >= 0.8) return 'bg-green-500';
      if (confidence >= 0.6) return 'bg-yellow-500';
      return 'bg-orange-500';
    }
    return 'bg-blue-500';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (compactMode) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return date.toLocaleTimeString();
  };

  const handleStepClick = (step: RAGJourneyStep, index: number) => {
    onStepClick?.(step, index);
  };

  const visibleSteps = liveSteps.slice(visibleRange.start, visibleRange.end);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Investigation Timeline</h3>
            <p className="text-sm text-gray-500">
              {liveSteps.length} events • {liveSteps.filter(s => s.ragEnhancement?.applied).length} RAG enhanced
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                autoScroll ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {autoScroll ? '▶️ Auto-scroll' : '⏸️ Manual'}
            </button>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
              isConnected ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <span>{isConnected ? 'Live' : 'Static'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div 
        ref={timelineRef}
        className={`relative overflow-y-auto p-6 ${
          compactMode ? 'max-h-96' : 'max-h-[600px]'
        }`}
      >
        {/* Timeline Line */}
        <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-6">
          {visibleSteps.map((step, index) => {
            const globalIndex = visibleRange.start + index;
            const isSelected = selectedStepId === step.id;
            const relativeTime = getRelativeTimeLabel(step.timestamp, globalIndex);
            
            return (
              <div 
                key={step.id} 
                className={`relative cursor-pointer transition-all duration-200 ${
                  isSelected ? 'scale-105' : 'hover:scale-102'
                }`}
                onClick={() => handleStepClick(step, globalIndex)}
              >
                {/* Timeline Dot */}
                <div className={`absolute left-6 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${
                  getStepSeverityColor(step)
                } ${isSelected ? 'ring-4 ring-indigo-200' : ''}`}>
                  <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                    {getStepTypeIcon(step)}
                  </div>
                </div>
                
                {/* Step Content */}
                <div className={`ml-12 bg-gray-50 rounded-lg p-4 border transition-all duration-200 ${
                  isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900">{step.title}</h4>
                        {step.ragEnhancement?.applied && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            🤖 RAG
                          </span>
                        )}
                      </div>
                      <p className={`text-xs text-gray-600 mb-2 ${
                        compactMode ? 'line-clamp-1' : 'line-clamp-2'
                      }`}>
                        {step.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>🤖 {step.agent}</span>
                        <span>⏱️ {formatTimestamp(step.timestamp)}</span>
                        {showTimeLabels && globalIndex > 0 && (
                          <span className="text-indigo-600 font-medium">{relativeTime}</span>
                        )}
                        {step.duration > 0 && (
                          <span>⏳ {step.duration < 1000 ? `${step.duration}ms` : `${(step.duration/1000).toFixed(1)}s`}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* RAG Confidence Indicator */}
                    {step.ragEnhancement?.applied && (
                      <div className="flex flex-col items-end space-y-1">
                        <div className={`w-2 h-2 rounded-full ${
                          step.ragEnhancement.confidence >= 0.8 ? 'bg-green-500' :
                          step.ragEnhancement.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} title={`Confidence: ${(step.ragEnhancement.confidence * 100).toFixed(0)}%`}></div>
                        <span className="text-xs text-gray-400">
                          {step.ragEnhancement.sources.length}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Tools and Insights (if not compact) */}
                  {!compactMode && (
                    <div className="space-y-2">
                      {step.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {step.tools.slice(0, 3).map((tool, idx) => (
                            <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {tool}
                            </span>
                          ))}
                          {step.tools.length > 3 && (
                            <span className="text-xs text-gray-500">+{step.tools.length - 3} more</span>
                          )}
                        </div>
                      )}
                      
                      {step.ragEnhancement?.applied && step.ragEnhancement.sources.length > 0 && (
                        <div className="text-xs text-purple-600">
                          📚 {step.ragEnhancement.sources.slice(0, 2).join(', ')}
                          {step.ragEnhancement.sources.length > 2 && ` +${step.ragEnhancement.sources.length - 2} more`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Load More / Pagination */}
        {liveSteps.length > visibleRange.end && (
          <div className="text-center pt-6">
            <button
              onClick={() => setVisibleRange(prev => ({ ...prev, end: prev.end + 20 }))}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Load More Steps ({liveSteps.length - visibleRange.end} remaining)
            </button>
          </div>
        )}
        
        {/* Empty State */}
        {liveSteps.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🕰️</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Timeline Empty</h4>
            <p className="text-sm text-gray-500">
              Investigation events will appear here chronologically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RAGJourneyTimeline;