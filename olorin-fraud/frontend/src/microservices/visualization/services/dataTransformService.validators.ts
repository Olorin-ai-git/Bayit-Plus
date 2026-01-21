/**
 * Data Transform Validators
 *
 * Zod schemas and validation functions for data transformations.
 * Extracted for better modularity and file size compliance.
 */

import { z } from 'zod';

/**
 * Network graph data structures
 */
export interface NetworkNode {
  id: string;
  type: 'account' | 'device' | 'location' | 'transaction' | 'person';
  label: string;
  metadata?: Record<string, unknown>;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
}

export interface NetworkGraphData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

/**
 * Timeline event data structure
 */
export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Risk score data structure
 */
export interface RiskScoreFactor {
  name: string;
  impact: number;
  description?: string;
}

export interface RiskScore {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskScoreFactor[];
}

/**
 * Map marker data structure
 */
export interface MapMarker {
  id: string;
  type: 'customer' | 'business' | 'device' | 'transaction' | 'risk';
  latitude: number;
  longitude: number;
  label: string;
  metadata?: Record<string, unknown>;
}

/**
 * Validate network graph response
 */
export function validateNetworkGraphResponse(data: unknown) {
  const schema = z.object({
    nodes: z.array(z.object({
      id: z.string(),
      type: z.enum(['account', 'device', 'location', 'transaction', 'person']),
      label: z.string().optional(),
      metadata: z.record(z.unknown()).optional()
    })),
    edges: z.array(z.object({
      id: z.string().optional(),
      source: z.string(),
      target: z.string(),
      type: z.string().optional(),
      weight: z.number().optional()
    }))
  });
  return schema.parse(data);
}

/**
 * Validate timeline response
 */
export function validateTimelineResponse(data: unknown) {
  const schema = z.object({
    events: z.array(z.object({
      id: z.string().optional(),
      timestamp: z.string().optional(),
      type: z.enum(['info', 'warning', 'critical', 'success']).optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      message: z.string(),
      metadata: z.record(z.unknown()).optional()
    }))
  });
  return schema.parse(data);
}

/**
 * Validate risk score response
 */
export function validateRiskScoreResponse(data: unknown) {
  const schema = z.object({
    score: z.number(),
    factors: z.array(z.object({
      name: z.string(),
      impact: z.number(),
      description: z.string().optional()
    }))
  });
  return schema.parse(data);
}

/**
 * Validate map markers response
 */
export function validateMapMarkersResponse(data: unknown) {
  const schema = z.object({
    markers: z.array(z.object({
      id: z.string().optional(),
      type: z.enum(['customer', 'business', 'device', 'transaction', 'risk']).optional(),
      latitude: z.number(),
      longitude: z.number(),
      label: z.string().optional(),
      metadata: z.record(z.unknown()).optional()
    }))
  });
  return schema.parse(data);
}

/**
 * Calculate risk level from score
 */
export function calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
