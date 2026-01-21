/**
 * Network Entity Configurations
 * IP address and URL entities
 * Feature: 005-polling-and-persistence
 */

import { ENTITY_TYPES } from '../constants/entity-type-constants';
import { EntityCategory } from '../types/entity-types';
import type { EntityType, EntityTypeConfig } from '../types/entity-types';

/** Network entity configurations (Priority 50-55) */
export const NETWORK_ENTITY_CONFIGS: Record<string, EntityTypeConfig> = {
  [ENTITY_TYPES.IP_ADDRESS]: {
    id: ENTITY_TYPES.IP_ADDRESS as EntityType,
    label: 'IP Address',
    description: 'Investigation based on IP address',
    category: EntityCategory.NETWORK,
    icon: 'globe-americas',
    validationPattern:
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
    placeholder: '192.168.1.1 or 2001:db8::1',
    examples: ['192.168.1.1', '10.0.0.1', '2001:db8::1'],
    priority: 50,
  },
  [ENTITY_TYPES.URL]: {
    id: ENTITY_TYPES.URL as EntityType,
    label: 'URL',
    description: 'Investigation based on URL',
    category: EntityCategory.NETWORK,
    icon: 'link',
    validationPattern: /^https?:\/\/.+/,
    placeholder: 'https://example.com',
    examples: ['https://suspicious-site.com', 'http://phishing.example'],
    priority: 51,
  },
};
