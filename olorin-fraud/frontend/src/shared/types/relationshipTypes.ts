/**
 * Entity Relationship Types
 * Feature: 005-polling-and-persistence
 *
 * Type definitions for entity relationships in investigation graphs.
 * Adapted from Olorin web plugin for Olorin frontend.
 */

/**
 * Types of relationships that can exist between entities
 */
export type RelationshipType =
  | 'same_device'
  | 'same_location'
  | 'same_ip'
  | 'temporal_correlation'
  | 'behavior_similarity'
  | 'transaction_link'
  | 'network_connection';

/**
 * Evidence supporting a relationship between entities
 */
export interface Evidence {
  type: string;
  description: string;
  confidence: number;
  timestamp: Date;
  sourceData?: Record<string, any>;
}

/**
 * Relationship between two entities in an investigation
 */
export interface EntityRelationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: RelationshipType;
  strength: number;
  discoveredAt: Date;
  evidence: Evidence[];
  bidirectional: boolean;
}

/**
 * Configuration for relationship display in graph visualizations
 */
export interface RelationshipDisplayConfig {
  type: RelationshipType;
  label: string;
  color: string;
  description: string;
}

/**
 * Display configuration for each relationship type
 * Used for consistent visualization across the application
 */
export const RELATIONSHIP_DISPLAY_CONFIG: Record<
  RelationshipType,
  RelationshipDisplayConfig
> = {
  same_device: {
    type: 'same_device',
    label: 'Same Device',
    color: '#60a5fa', // Blue
    description: 'Entities share the same device fingerprint',
  },
  same_location: {
    type: 'same_location',
    label: 'Same Location',
    color: '#34d399', // Green
    description: 'Entities originate from the same geographic location',
  },
  same_ip: {
    type: 'same_ip',
    label: 'Same IP',
    color: '#fbbf24', // Amber
    description: 'Entities share the same IP address',
  },
  temporal_correlation: {
    type: 'temporal_correlation',
    label: 'Temporal Link',
    color: '#a78bfa', // Purple
    description: 'Entities have correlated activity patterns over time',
  },
  behavior_similarity: {
    type: 'behavior_similarity',
    label: 'Behavior Match',
    color: '#f472b6', // Pink
    description: 'Entities exhibit similar behavioral patterns',
  },
  transaction_link: {
    type: 'transaction_link',
    label: 'Transaction Link',
    color: '#fb923c', // Orange
    description: 'Entities are connected through financial transactions',
  },
  network_connection: {
    type: 'network_connection',
    label: 'Network Link',
    color: '#22d3ee', // Cyan
    description: 'Entities are part of the same network cluster',
  },
};

/**
 * Get display configuration for a relationship type
 *
 * @param type - The relationship type
 * @returns Display configuration including label, color, and description
 */
export function getRelationshipConfig(
  type: RelationshipType,
): RelationshipDisplayConfig {
  return RELATIONSHIP_DISPLAY_CONFIG[type];
}

/**
 * Format relationship type for display
 *
 * @param type - The relationship type
 * @returns Human-readable label
 */
export function formatRelationshipType(type: RelationshipType): string {
  return RELATIONSHIP_DISPLAY_CONFIG[type].label;
}

/**
 * Get color for relationship type visualization
 *
 * @param type - The relationship type
 * @returns Hex color code for the relationship
 */
export function getRelationshipColor(type: RelationshipType): string {
  return RELATIONSHIP_DISPLAY_CONFIG[type].color;
}

/**
 * Calculate visual width for relationship edge based on strength
 *
 * @param strength - Relationship strength (0.0 to 1.0)
 * @returns Width value for edge visualization
 */
export function calculateRelationshipWidth(strength: number): number {
  return Math.max(1, Math.min(10, strength * 10));
}
