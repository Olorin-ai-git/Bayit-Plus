/**
 * LEGACY entityTypes.ts
 * This file has been SUPERSEDED by the new modular entity types architecture
 * Feature: 005-polling-and-persistence
 *
 * REFACTORED FROM: 543 lines (271% over 200-line limit!)
 * NEW ARCHITECTURE: 13 focused modules under entities/ directory
 *
 * NEW MODULES (all < 200 lines):
 * ✅ constants/entity-type-constants.ts (58 lines) - Entity type constants
 * ✅ types/entity-types.ts (51 lines) - Type definitions and interfaces
 * ✅ config/identity-entities.ts (69 lines) - Identity entity configurations
 * ✅ config/device-entities.ts (55 lines) - Device entity configurations
 * ✅ config/contact-entities.ts (43 lines) - Contact entity configurations
 * ✅ config/financial-entities.ts (42 lines) - Financial entity configurations
 * ✅ config/business-entities.ts (83 lines) - Business entity configurations
 * ✅ config/network-entities.ts (36 lines) - Network entity configurations
 * ✅ config/application-entities.ts (73 lines) - Application entity configurations
 * ✅ config/entity-config-registry.ts (26 lines) - Complete config registry
 * ✅ templates/investigation-templates.ts (95 lines) - Investigation templates
 * ✅ utils/entity-helpers.ts (72 lines) - Helper functions
 * ✅ index.ts (61 lines) - Public API with re-exports
 *
 * Backward compatibility: All exports maintained via re-exports below
 */

// Re-export all types, constants, and functions from the modular architecture
export { ENTITY_TYPES } from './entities';
export type { EntityType, LegacyEntityType } from './entities';

export { EntityCategory } from './entities';
export type {
  EntityTypeConfig,
  EntityTemplateEntity,
  InvestigationTemplate,
} from './entities';

export { ENTITY_TYPE_CONFIG } from './entities';

export {
  IDENTITY_ENTITY_CONFIGS,
  DEVICE_ENTITY_CONFIGS,
  CONTACT_ENTITY_CONFIGS,
  FINANCIAL_ENTITY_CONFIGS,
  BUSINESS_ENTITY_CONFIGS,
  NETWORK_ENTITY_CONFIGS,
  APPLICATION_ENTITY_CONFIGS,
} from './entities';

export {
  COMMON_ENTITY_COMBINATIONS,
  type CommonEntityCombination,
} from './entities';

export {
  getEntityTypeConfig,
  getEntityTypesByCategory,
  getAllEntityTypes,
  isValidEntityType,
  validateEntityValue,
  mapEntityTypeForBackend,
} from './entities';
