/**
 * Findings and Anomaly Types
 * Feature: 007-progress-wizard-page
 *
 * Data structures for anomalies, findings, and entity relationships.
 */

/**
 * Anomaly detection data structure
 */
export interface AnomalyDetection {
  // Identification
  id: string;
  type: string;  // e.g., 'device_mismatch', 'location_anomaly', 'suspicious_pattern'

  // Severity
  severity: 'low' | 'medium' | 'high' | 'critical';
  severityScore: number;  // 0-100

  // Context
  entityId: string;
  entityType: string;
  detectingAgent: string;
  detectingTool: string;

  // Evidence
  confidence: number;  // 0-1
  description: string;
  supportingEvidence: {
    toolExecutionId: string;
    dataPoints: unknown[];
  }[];

  // Timestamps
  detectedAt: Date;
}

/**
 * Entity relationship tracking
 */
export interface EntityRelationship {
  // Identification
  id: string;
  sourceEntityId: string;
  targetEntityId: string;

  // Relationship type
  type: 'shared_device' | 'shared_location' | 'shared_behavior' | 'shared_network' | 'temporal_proximity';
  description: string;

  // Strength
  strength: number;  // 0-100
  confidence: number;  // 0-1

  // Evidence
  discoveredByTools: string[];
  supportingFindings: string[];

  // Timestamps
  discoveredAt: Date;
  lastConfirmedAt: Date;
}

/**
 * Finding from tool execution
 */
export interface Finding {
  id: string;
  type: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  severityScore?: number;
  description: string;
  confidence?: number;
  evidence?: unknown[];
  metadata?: Record<string, unknown>;
}
