/**
 * Entity Type Interfaces and Enums
 * Core type definitions for entity management
 * Feature: 005-polling-and-persistence
 */

import type { EntityType } from '../constants/entity-type-constants';

// Entity type categories for UI organization
export enum EntityCategory {
  IDENTITY = 'identity',
  DEVICE = 'device',
  CONTACT = 'contact',
  FINANCIAL = 'financial',
  BUSINESS = 'business',
  NETWORK = 'network',
  APPLICATION = 'application',
}

// Entity type metadata for UI display and validation
export interface EntityTypeConfig {
  id: EntityType;
  label: string;
  description: string;
  category: EntityCategory;
  icon: string; // Icon name for UI
  validationPattern?: RegExp;
  placeholder?: string;
  examples?: string[];
  priority: number; // For ordering in UI (lower = higher priority)
  isDeprecated?: boolean;
  alias?: EntityType; // For backward compatibility mappings
}

// Entity template configuration with weights
export interface EntityTemplateEntity {
  entityType: EntityType;
  weight: number;
  isPrimary?: boolean;
}

// Investigation template structure
export interface InvestigationTemplate {
  name: string;
  description: string;
  entities: EntityTemplateEntity[];
  correlationMode: 'AND' | 'OR';
  useCase: string;
  isCustom?: boolean;
  id?: string;
}
