/**
 * Entity Types - Public API
 * Main entry point with backward-compatible exports
 * Feature: 005-polling-and-persistence
 *
 * REFACTORED FROM: entityTypes.ts (543 lines, 271% over 200-line limit!)
 * NEW ARCHITECTURE: Modular structure with focused modules
 *
 * MODULES (all < 200 lines):
 * - constants/entity-type-constants.ts (58 lines) - Entity type constants
 * - types/entity-types.ts (51 lines) - Type definitions and interfaces
 * - config/identity-entities.ts (69 lines) - Identity entity configurations
 * - config/device-entities.ts (55 lines) - Device entity configurations
 * - config/contact-entities.ts (43 lines) - Contact entity configurations
 * - config/financial-entities.ts (42 lines) - Financial entity configurations
 * - config/business-entities.ts (83 lines) - Business entity configurations
 * - config/network-entities.ts (36 lines) - Network entity configurations
 * - config/application-entities.ts (73 lines) - Application entity configurations
 * - config/entity-config-registry.ts (26 lines) - Complete config registry
 * - templates/investigation-templates.ts (95 lines) - Investigation templates
 * - utils/entity-helpers.ts (72 lines) - Helper functions
 */

// Constants
export { ENTITY_TYPES } from './constants/entity-type-constants';
export type { EntityType, LegacyEntityType } from './constants/entity-type-constants';

// Types and Interfaces
export { EntityCategory } from './types/entity-types';
export type {
  EntityTypeConfig,
  EntityTemplateEntity,
  InvestigationTemplate,
} from './types/entity-types';

// Configuration Registry
export { ENTITY_TYPE_CONFIG } from './config/entity-config-registry';

// Category-Specific Configurations
export { IDENTITY_ENTITY_CONFIGS } from './config/identity-entities';
export { DEVICE_ENTITY_CONFIGS } from './config/device-entities';
export { CONTACT_ENTITY_CONFIGS } from './config/contact-entities';
export { FINANCIAL_ENTITY_CONFIGS } from './config/financial-entities';
export { BUSINESS_ENTITY_CONFIGS } from './config/business-entities';
export { NETWORK_ENTITY_CONFIGS } from './config/network-entities';
export { APPLICATION_ENTITY_CONFIGS } from './config/application-entities';

// Investigation Templates
export {
  COMMON_ENTITY_COMBINATIONS,
  type CommonEntityCombination,
} from './templates/investigation-templates';

// Helper Functions
export {
  getEntityTypeConfig,
  getEntityTypesByCategory,
  getAllEntityTypes,
  isValidEntityType,
  validateEntityValue,
  mapEntityTypeForBackend,
} from './utils/entity-helpers';
