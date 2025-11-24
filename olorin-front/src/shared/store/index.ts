/**
 * Wizard Store Index
 * Feature: 005-polling-and-persistence
 *
 * Central export point for wizard store with proper initialization order.
 */

// Export the store
// Initialize backward compatibility layer AFTER store is exported
import { initializeBackwardCompatibility } from './wizardStoreCompat';

export { useWizardStore } from './wizardStore';
initializeBackwardCompatibility();
