/**
 * Wizard Backward Compatibility Actions
 * Feature: 004-new-olorin-frontend
 *
 * Backward compatibility actions for Feature 004 API.
 * Extracted from wizardStoreActions.ts to maintain < 200 line limit.
 *
 * Provides updateSettings and startInvestigation for legacy wizard components.
 */

import { serializeSettingsForBackend } from '../services/settingsSerializer';
import { validateRequiredSettings } from './wizardValidation';
import { ensureValidSettings } from '@microservices/investigation/utils/defaultSettings';
import {
  WizardState,
  WizardStep,
  InvestigationSettings,
  InvestigationStatus,
  LifecycleStage
} from '../types/wizardState';

/**
 * Create backward compatibility actions for Feature 004 API
 */
export function createBackwardCompatActions(get: any, set?: any) {
  return {
    updateSettings: (settingsUpdate: Partial<InvestigationSettings>) => {
      const { wizardState } = get();

      // Log tool selection updates for debugging
      if (settingsUpdate.toolSelections) {
        console.log('[updateSettings] Updating toolSelections:', {
          count: settingsUpdate.toolSelections.length,
          tools: settingsUpdate.toolSelections.map(t => ({
            name: t.toolName,
            enabled: t.isEnabled
          }))
        });
      }

      // If no wizard state exists, create default wizard state locally only
      // Don't sync to server until user starts investigation
      if (!wizardState) {
        const normalizedSettings = ensureValidSettings(settingsUpdate);
        const defaultWizardState: WizardState = {
          investigation_id: crypto.randomUUID(),
          user_id: '',
          version: 1,
          wizard_step: WizardStep.SETTINGS,
          status: InvestigationStatus.CREATED,
          settings: normalizedSettings,
          progress: undefined,
          results: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('[updateSettings] Created new wizard state with settings:', {
          entities: normalizedSettings.entities?.length,
          toolSelections: normalizedSettings.toolSelections?.length
        });

        // Update store locally only - don't sync to server yet
        // IMPORTANT: Also set settings property directly for backward compatibility
        if (set) {
          set({
            wizardState: defaultWizardState,
            serverState: null,  // No server state yet
            localChanges: { settings: normalizedSettings },  // Track as local changes
            settings: normalizedSettings  // Set directly for immediate access
          });
        }
        return;
      }

      // If wizard state exists, merge settings and update locally
      // Normalize settings to ensure all required properties exist (without strict validation)
      const existingSettings = ensureValidSettings(wizardState.settings);
      const mergedSettings = ensureValidSettings({ ...existingSettings, ...settingsUpdate });
      const updatedWizardState = { ...wizardState, settings: mergedSettings };

      console.log('[updateSettings] Merged settings:', {
        entities: mergedSettings.entities?.length,
        toolSelections: mergedSettings.toolSelections?.length,
        updateKeys: Object.keys(settingsUpdate)
      });

      // Update locally without syncing to server
      // IMPORTANT: Also set settings property directly for backward compatibility
      if (set) {
        set({
          wizardState: updatedWizardState,
          localChanges: { ...get().localChanges, settings: mergedSettings },
          settings: mergedSettings  // Set directly for immediate access
        });
      }
    },

    startInvestigation: async () => {
      const { wizardState, settings } = get();

      // Check for settings either in wizardState or standalone settings field
      const investigationSettings = wizardState?.settings || settings;
      if (!investigationSettings) {
        throw new Error('No investigation settings configured');
      }

      try {
        // Validate and serialize settings to backend format
        // This may throw validation errors which will be caught below
        console.log('[startInvestigation] Serializing settings...');
        console.log('[startInvestigation] Current settings:', {
          entities: investigationSettings.entities?.length,
          toolSelections: investigationSettings.toolSelections?.length,
          tools: investigationSettings.tools?.length,
          timeRange: investigationSettings.timeRange || investigationSettings.time_range,
          investigationType: investigationSettings.investigationType
        });

        // Pass investigation type to serializer for conditional validation
        // For hybrid-graph, tool selection is optional (LLM chooses tools)
        const backendSettings = serializeSettingsForBackend(
          investigationSettings,
          investigationSettings.investigationType
        );

        console.log('[startInvestigation] Creating investigation (backend will generate ID):', {
          settings: backendSettings
        });

        // BACKEND GENERATES ID: Don't send investigation_id - let backend create it
        const createdState = await get().createState({
          // investigation_id is optional - backend will generate UUID
          settings: backendSettings as any,
          status: InvestigationStatus.IN_PROGRESS,
          lifecycle_stage: LifecycleStage.IN_PROGRESS
        });

        // Verify investigation was created and ID was returned from backend
        if (!createdState || !createdState.investigation_id) {
          throw new Error('Investigation created but no ID returned from server');
        }

        console.log('[startInvestigation] Investigation created successfully with backend-generated ID:', {
          investigation_id: createdState.investigation_id,
          status: createdState.status
        });

        // Update store with server-confirmed state
        set({
          wizardState: createdState,
          serverState: createdState,
          localChanges: null,
          // Investigation data removed - fetched from API based on URL ?id=xxx
          // Ensure settings is also set for ProgressPage
          // CRITICAL: Use settings from backend response, not local settings
          // Backend may have modified settings (e.g., auto-selected entities)
          settings: createdState.settings
        });

        console.log('[startInvestigation] Store updated with investigation:', {
          investigation_id: createdState.investigation_id,
          has_settings_field: !!get().settings
        });

        // Navigation removed - handled by component calling startInvestigation
        // Component should navigate to: /investigation/progress?id={investigation_id}
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create investigation';
        console.error('[startInvestigation] Error:', errorMessage);
        set({ error: errorMessage });
        throw error;
      }
    }
  };
}
