/**
 * Investigation Comparison Utilities
 *
 * Utilities for extracting comparison data from investigations
 * and preparing comparison requests.
 *
 * Constitutional Compliance:
 * - All data from investigation objects (no hardcoded values)
 * - Handles missing data gracefully
 */

import type { Investigation } from '../types/investigations';
import type { ComparisonRequest, WindowSpec, Entity } from '../../investigation/types/comparison';

const MAX_COMPARISON_INVESTIGATIONS = 2;

/**
 * Extract entity information from investigation
 */
export function extractEntityFromInvestigation(investigation: Investigation): Entity | undefined {
  if (!investigation.entity_type || !investigation.entity_id) {
    return undefined;
  }

  // Map investigation entity_type to comparison entity type
  const entityTypeMap: Record<string, string> = {
    'email': 'email',
    'phone': 'phone',
    'device_id': 'device_id',
    'ip': 'ip',
    'account_id': 'account_id',
    'card_fingerprint': 'card_fingerprint',
    'merchant_id': 'merchant_id',
    'user_id': 'account_id', // Map user_id to account_id
  };

  const mappedType = entityTypeMap[investigation.entity_type.toLowerCase()] || investigation.entity_type.toLowerCase();
  
  return {
    type: mappedType as Entity['type'],
    value: investigation.entity_id
  };
}

/**
 * Extract time window from investigation
 */
export function extractTimeWindowFromInvestigation(investigation: Investigation): WindowSpec | undefined {
  if (!investigation.from || !investigation.to) {
    return undefined;
  }

  return {
    preset: 'custom',
    start: investigation.from,
    end: investigation.to,
    label: investigation.name || `Investigation ${investigation.id}`
  };
}

/**
 * Validate that two investigations can be compared
 */
export function canCompareInvestigations(inv1: Investigation, inv2: Investigation): { valid: boolean; reason?: string } {
  // Both must have entity information
  if (!inv1.entity_type || !inv1.entity_id) {
    return { valid: false, reason: `Investigation "${inv1.name || inv1.id}" is missing entity information` };
  }
  if (!inv2.entity_type || !inv2.entity_id) {
    return { valid: false, reason: `Investigation "${inv2.name || inv2.id}" is missing entity information` };
  }

  // Both must have time windows
  if (!inv1.from || !inv1.to) {
    return { valid: false, reason: `Investigation "${inv1.name || inv1.id}" is missing time window` };
  }
  if (!inv2.from || !inv2.to) {
    return { valid: false, reason: `Investigation "${inv2.name || inv2.id}" is missing time window` };
  }

  // Entities should match (for meaningful comparison)
  const entity1 = extractEntityFromInvestigation(inv1);
  const entity2 = extractEntityFromInvestigation(inv2);
  
  if (entity1 && entity2 && (entity1.type !== entity2.type || entity1.value !== entity2.value)) {
    return { 
      valid: false, 
      reason: `Investigations have different entities (${entity1.type}:${entity1.value} vs ${entity2.type}:${entity2.value})` 
    };
  }

  return { valid: true };
}

/**
 * Build comparison request from two investigations.
 * 
 * For investigation-level comparison (risk scores, LLM insights),
 * returns investigation IDs. For transaction-level comparison,
 * returns window-based request.
 */
export function buildComparisonRequest(
  investigationA: Investigation,
  investigationB: Investigation
): ComparisonRequest | { error: string } | { investigation_id_a: string; investigation_id_b: string } {
  const validation = canCompareInvestigations(investigationA, investigationB);
  if (!validation.valid) {
    return { error: validation.reason || 'Cannot compare investigations' };
  }

  // For investigation-level comparison, we can use investigation IDs directly
  // This compares risk scores and LLM insights rather than transaction metrics
  if (investigationA.id && investigationB.id) {
    return {
      investigation_id_a: investigationA.id,
      investigation_id_b: investigationB.id
    };
  }

  // Fallback to transaction-level comparison if IDs are missing
  const entity = extractEntityFromInvestigation(investigationA);
  const windowA = extractTimeWindowFromInvestigation(investigationA);
  const windowB = extractTimeWindowFromInvestigation(investigationB);

  if (!entity || !windowA || !windowB) {
    return { error: 'Missing required data for comparison' };
  }

  return {
    entity,
    windowA,
    windowB,
    risk_threshold: 0.7, // Default, can be overridden
    options: {
      include_per_merchant: true,
      max_merchants: 25,
      include_histograms: false,
      include_timeseries: false
    }
  };
}

/**
 * Get maximum number of investigations that can be selected for comparison
 */
export function getMaxComparisonInvestigations(): number {
  return MAX_COMPARISON_INVESTIGATIONS;
}

