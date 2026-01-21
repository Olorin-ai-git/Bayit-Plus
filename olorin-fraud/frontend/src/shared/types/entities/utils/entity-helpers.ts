/**
 * Entity Helper Functions
 * Utility functions for entity type management
 * Feature: 005-polling-and-persistence
 */

import { ENTITY_TYPES } from '../constants/entity-type-constants';
import { ENTITY_TYPE_CONFIG } from '../config/entity-config-registry';
import type { EntityType, EntityTypeConfig, EntityCategory } from '../types/entity-types';

/**
 * Get entity type configuration
 * Falls back to user_id if invalid type provided
 */
export const getEntityTypeConfig = (entityType: EntityType): EntityTypeConfig => {
  const config = ENTITY_TYPE_CONFIG[entityType];
  if (!config) {
    console.warn(`Invalid entity type: ${entityType}. Falling back to user_id.`);
    return ENTITY_TYPE_CONFIG['user_id'];
  }
  return config;
};

/**
 * Get all entity types in a specific category
 * Sorted by priority (lower = higher priority)
 */
export const getEntityTypesByCategory = (
  category: EntityCategory,
): EntityTypeConfig[] => {
  return Object.values(ENTITY_TYPE_CONFIG)
    .filter((config) => config.category === category)
    .sort((a, b) => a.priority - b.priority);
};

/**
 * Get all entity types sorted by priority
 */
export const getAllEntityTypes = (): EntityTypeConfig[] => {
  return Object.values(ENTITY_TYPE_CONFIG).sort(
    (a, b) => a.priority - b.priority,
  );
};

/**
 * Check if a string is a valid entity type
 */
export const isValidEntityType = (
  entityType: string,
): entityType is EntityType => {
  return Object.values(ENTITY_TYPES).includes(entityType as EntityType);
};

/**
 * Validate entity value against entity type's validation pattern
 */
export const validateEntityValue = (
  entityType: EntityType,
  value: string,
): boolean => {
  const config = getEntityTypeConfig(entityType);
  if (!config.validationPattern) return true;
  return config.validationPattern.test(value);
};

/**
 * Backend compatibility mapping for API calls
 * Entity types are already stored in lowercase format
 */
export const mapEntityTypeForBackend = (entityType: EntityType): string => {
  // Return as-is for backend API validation
  return entityType;
};
