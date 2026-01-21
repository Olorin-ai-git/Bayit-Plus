/**
 * Device Entity Configurations
 * Device ID, exact ID, digital ID, and smart ID entities
 * Feature: 005-polling-and-persistence
 */

import { ENTITY_TYPES } from '../constants/entity-type-constants';
import { EntityCategory } from '../types/entity-types';
import type { EntityType, EntityTypeConfig } from '../types/entity-types';

/** Device entity configurations (Priority 10-15) */
export const DEVICE_ENTITY_CONFIGS: Record<string, EntityTypeConfig> = {
  [ENTITY_TYPES.DEVICE_ID]: {
    id: ENTITY_TYPES.DEVICE_ID as EntityType,
    label: 'Device ID',
    description: 'Investigation based on device identifier (legacy)',
    category: EntityCategory.DEVICE,
    icon: 'device-phone-mobile',
    placeholder: 'Enter device ID',
    examples: ['device123', 'mobile_abc123'],
    priority: 10,
    isDeprecated: true,
  },
  [ENTITY_TYPES.DEVICE_EXACT_ID]: {
    id: ENTITY_TYPES.DEVICE_EXACT_ID as EntityType,
    label: 'Exact Device ID',
    description: 'Investigation based on exact device identifier',
    category: EntityCategory.DEVICE,
    icon: 'device-phone-mobile',
    placeholder: 'Enter exact device ID',
    examples: ['dev_12345', 'mobile_abc123'],
    priority: 11,
  },
  [ENTITY_TYPES.DEVICE_DIGITAL_ID]: {
    id: ENTITY_TYPES.DEVICE_DIGITAL_ID as EntityType,
    label: 'Digital Device ID',
    description: 'Investigation based on digital device fingerprint',
    category: EntityCategory.DEVICE,
    icon: 'fingerprint',
    placeholder: 'Enter digital device ID',
    examples: ['dig_12345', 'fp_abc123'],
    priority: 12,
  },
  [ENTITY_TYPES.DEVICE_SMART_ID]: {
    id: ENTITY_TYPES.DEVICE_SMART_ID as EntityType,
    label: 'Smart Device ID',
    description: 'Investigation based on smart device identifier',
    category: EntityCategory.DEVICE,
    icon: 'computer-desktop',
    placeholder: 'Enter smart device ID',
    examples: ['smart_12345', 'iot_abc123'],
    priority: 13,
  },
};
