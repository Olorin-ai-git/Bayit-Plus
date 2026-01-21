/**
 * Contact Entity Configurations
 * Email, phone, and email domain entities
 * Feature: 005-polling-and-persistence
 */

import { ENTITY_TYPES } from '../constants/entity-type-constants';
import { EntityCategory } from '../types/entity-types';
import type { EntityType, EntityTypeConfig } from '../types/entity-types';

/** Contact entity configurations (Priority 20-25) */
export const CONTACT_ENTITY_CONFIGS: Record<string, EntityTypeConfig> = {
  [ENTITY_TYPES.EMAIL]: {
    id: ENTITY_TYPES.EMAIL as EntityType,
    label: 'Email Address',
    description: 'Investigation based on email address',
    category: EntityCategory.CONTACT,
    icon: 'envelope',
    validationPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    placeholder: 'user@example.com',
    examples: ['john.doe@company.com', 'user123@email.com'],
    priority: 20,
  },
  [ENTITY_TYPES.PHONE]: {
    id: ENTITY_TYPES.PHONE as EntityType,
    label: 'Phone Number',
    description: 'Investigation based on phone number',
    category: EntityCategory.CONTACT,
    icon: 'phone',
    validationPattern: /^[\+]?[1-9][\d]{0,15}$/,
    placeholder: '+1-555-123-4567',
    examples: ['+15551234567', '555-123-4567', '(555) 123-4567'],
    priority: 21,
  },
  [ENTITY_TYPES.EMAIL_DOMAIN]: {
    id: ENTITY_TYPES.EMAIL_DOMAIN as EntityType,
    label: 'Email Domain',
    description: 'Investigation based on email domain',
    category: EntityCategory.CONTACT,
    icon: 'globe-alt',
    validationPattern: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/,
    placeholder: 'example.com',
    examples: ['company.com', 'suspicious-domain.net'],
    priority: 22,
  },
};
