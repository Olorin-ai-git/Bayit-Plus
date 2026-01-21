/**
 * Type definitions for ResponseAnalyzer service
 * Comprehensive types for response analysis, fraud detection, and metrics tracking
 */

/**
 * Analysis result from response text analysis
 */
export interface AnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  keywords: string[];
  entities: {
    type: string;
    value: string;
    confidence: number;
  }[];
  summary: string;
  actionItems: string[];
  risksIdentified: string[];
}

/**
 * Performance and quality metrics for responses
 */
export interface ResponseMetrics {
  responseTime: number;
  tokenCount: number;
  qualityScore: number;
  relevanceScore: number;
  completenessScore: number;
}

/**
 * Fraud indicators and risk assessment results
 */
export interface FraudIndicators {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  indicators: {
    type: string;
    description: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
  }[];
  recommendation: string;
  next_actions: string[];
}

/**
 * Entity type extracted from text
 */
export interface Entity {
  type: string;
  value: string;
  confidence: number;
}

/**
 * Sentiment analysis result
 */
export type Sentiment = 'positive' | 'negative' | 'neutral';

/**
 * Risk level classification
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Severity level for indicators
 */
export type SeverityLevel = 'low' | 'medium' | 'high';
