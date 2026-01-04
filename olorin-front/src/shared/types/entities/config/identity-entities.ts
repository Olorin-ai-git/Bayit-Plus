/**
 * Identity Entity Configurations
 * User, buyer, SSN, FEIN, and realm entities
 * Feature: 005-polling-and-persistence
 */

import { ENTITY_TYPES } from '../constants/entity-type-constants';
import { EntityCategory } from '../types/entity-types';
import type { EntityType, EntityTypeConfig } from '../types/entity-types';

/** Identity entity configurations (Priority 1-5) */
export const IDENTITY_ENTITY_CONFIGS: Record<string, EntityTypeConfig> = {
  [ENTITY_TYPES.USER_ID]: {
    id: ENTITY_TYPES.USER_ID as EntityType,
    label: 'Auth ID',
    description: 'Investigation based on user identifier',
    category: EntityCategory.IDENTITY,
    icon: 'user',
    validationPattern: /^[a-zA-Z0-9_\-]+$/,
    placeholder: 'Enter auth ID',
    examples: ['12345'],
    priority: 1,
  },
  [ENTITY_TYPES.BUYER_ID]: {
    id: ENTITY_TYPES.BUYER_ID as EntityType,
    label: 'Buyer ID',
    description: 'Investigation based on buyer identifier',
    category: EntityCategory.IDENTITY,
    icon: 'user-check',
    validationPattern: /^[a-zA-Z0-9_\-]+$/,
    placeholder: 'Enter buyer ID',
    examples: ['buyer123', 'b_12345'],
    priority: 2,
  },
  [ENTITY_TYPES.SSN]: {
    id: ENTITY_TYPES.SSN as EntityType,
    label: 'Social Security Number',
    description: 'Investigation based on SSN',
    category: EntityCategory.IDENTITY,
    icon: 'shield-check',
    validationPattern: /^\d{3}-?\d{2}-?\d{4}$/,
    placeholder: 'XXX-XX-XXXX',
    examples: ['123-45-6789', '123456789'],
    priority: 3,
  },
  [ENTITY_TYPES.FEIN]: {
    id: ENTITY_TYPES.FEIN as EntityType,
    label: 'Federal EIN',
    description: 'Investigation based on Federal Employer Identification Number',
    category: EntityCategory.IDENTITY,
    icon: 'building-office',
    validationPattern: /^\d{2}-?\d{7}$/,
    placeholder: 'XX-XXXXXXX',
    examples: ['12-3456789', '123456789'],
    priority: 4,
  },
  [ENTITY_TYPES.REALM]: {
    id: ENTITY_TYPES.REALM as EntityType,
    label: 'Realm',
    description: 'Investigation based on authentication realm',
    category: EntityCategory.IDENTITY,
    icon: 'key',
    placeholder: 'Enter realm',
    examples: ['corporate', 'external', 'admin'],
    priority: 5,
  },
};
