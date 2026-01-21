/**
 * Entity Configuration Registry
 * Combines all entity category configurations into complete registry
 * Feature: 005-polling-and-persistence
 */

import type { EntityType, EntityTypeConfig } from '../types/entity-types';
import { IDENTITY_ENTITY_CONFIGS } from './identity-entities';
import { DEVICE_ENTITY_CONFIGS } from './device-entities';
import { CONTACT_ENTITY_CONFIGS } from './contact-entities';
import { FINANCIAL_ENTITY_CONFIGS } from './financial-entities';
import { BUSINESS_ENTITY_CONFIGS } from './business-entities';
import { NETWORK_ENTITY_CONFIGS } from './network-entities';
import { APPLICATION_ENTITY_CONFIGS } from './application-entities';

/**
 * Complete entity type configuration registry
 * Combines all category-specific configurations
 */
export const ENTITY_TYPE_CONFIG: Record<EntityType, EntityTypeConfig> = {
  ...IDENTITY_ENTITY_CONFIGS,
  ...DEVICE_ENTITY_CONFIGS,
  ...CONTACT_ENTITY_CONFIGS,
  ...FINANCIAL_ENTITY_CONFIGS,
  ...BUSINESS_ENTITY_CONFIGS,
  ...NETWORK_ENTITY_CONFIGS,
  ...APPLICATION_ENTITY_CONFIGS,
} as Record<EntityType, EntityTypeConfig>;
