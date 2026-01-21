/**
 * Wizard Store Backward Compatibility
 * Feature: 005-polling-and-persistence
 *
 * Provides backward compatibility with Feature 004 API.
 * Automatically syncs computed properties when wizardState changes.
 */

import { useWizardStore } from './wizardStore';
import type { WizardStoreState } from '../types/wizardState';

/**
 * Initialize backward compatibility layer
 * Subscribe to wizardState changes and update computed properties
 * Call this AFTER the store is fully created
 */
export function initializeBackwardCompatibility() {
  useWizardStore.subscribe((state) => {
    const wizardState = state.wizardState;

    // Update settings
    const settings = wizardState?.settings || null;
    if (state.settings !== settings) {
      useWizardStore.setState({ settings } as Partial<WizardStoreState>);
    }

    // Update investigation
    const investigation = wizardState ? {
      id: wizardState.investigation_id,
      status: wizardState.status,
      createdAt: wizardState.created_at,
      updatedAt: wizardState.updated_at
    } : null;

    if (JSON.stringify(state.investigation) !== JSON.stringify(investigation)) {
      useWizardStore.setState({ investigation } as Partial<WizardStoreState>);
    }
  });
}
