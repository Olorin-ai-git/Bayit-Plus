import { RAGToolInsight } from '../types/RAGTypes';

/**
 * Sort insights based on different criteria
 */
export const sortInsights = (
  insights: RAGToolInsight[], 
  sortBy: 'confidence' | 'effectiveness' | 'recent'
): RAGToolInsight[] => {
  return [...insights].sort((a, b) => {
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
};

/**
 * Create an insight object from WebSocket event data
 */
export const createInsightFromEvent = (event: any): RAGToolInsight => {
  return {
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
};

/**
 * Get color classes for confidence levels
 */
export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-600 bg-green-100 border-green-200';
  if (confidence >= 0.6) return 'text-blue-600 bg-blue-100 border-blue-200';
  return 'text-yellow-600 bg-yellow-100 border-yellow-200';
};

/**
 * Get effectiveness level description
 */
export const getEffectivenessLevel = (effectiveness: number): string => {
  if (effectiveness >= 0.8) return 'Excellent';
  if (effectiveness >= 0.6) return 'Good';
  if (effectiveness >= 0.4) return 'Fair';
  return 'Poor';
};

/**
 * Get tool icon for display
 */
export const getToolIcon = (toolName: string): string => {
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

/**
 * Format usage history for display
 */
export const formatUsageHistory = (history: RAGToolInsight['usageHistory']) => {
  const recent = history.slice(0, 5);
  const successRate = recent.length > 0 
    ? (recent.filter(h => h.success).length / recent.length) * 100 
    : 0;
  return { recent, successRate };
};

/**
 * Calculate summary statistics for insights
 */
export const calculateInsightsSummary = (insights: RAGToolInsight[]) => {
  if (insights.length === 0) {
    return {
      total: 0,
      highConfidence: 0,
      withAlternatives: 0,
      avgEffectiveness: 0,
    };
  }

  return {
    total: insights.length,
    highConfidence: insights.filter(i => i.confidence >= 0.8).length,
    withAlternatives: insights.filter(i => i.alternatives.length > 0).length,
    avgEffectiveness: (insights.reduce((sum, i) => sum + i.effectiveness, 0) / insights.length) * 100,
  };
};