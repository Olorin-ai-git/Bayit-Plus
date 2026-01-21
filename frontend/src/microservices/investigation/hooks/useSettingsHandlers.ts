/**
 * Settings Page Handlers Hook
 * Feature: 004-new-olorin-frontend, 006-hybrid-graph-integration (simplified)
 *
 * Centralized event handlers for Settings Page using unified investigation flow.
 */

import { useNavigate } from 'react-router-dom';
import { useWizardStore } from '@shared/store/wizardStore';
import { useWizardNavigation } from '@shared/hooks/useWizardNavigation';
import { useWizardValidation } from '@shared/hooks/useWizardValidation';
import type { Entity } from '@shared/types/entities.types';
import { eventBus } from '@shared/events/UnifiedEventBus';
import { WizardStateError } from '@shared/services/wizardStateService.errors';

export function useSettingsHandlers() {
  const navigate = useNavigate();
  const settings = useWizardStore((state) => state.settings);
  const updateSettings = useWizardStore((state) => state.updateSettings);
  const startInvestigation = useWizardStore((state) => state.startInvestigation);
  const wizardState = useWizardStore((state) => state.wizardState);

  const { goNext } = useWizardNavigation();
  const { validateEntity, canStartInvestigation } = useWizardValidation();

  const handleEntityAdd = (entity: Entity) => {
    if (!settings) return;

    const validation = validateEntity(entity);
    if (!validation.isValid) return;

    const updatedEntities = [...settings.entities, entity];
    updateSettings({ entities: updatedEntities });
  };

  const handleEntityRemove = (index: number) => {
    if (!settings) return;

    const updatedEntities = settings.entities.filter((_, i) => i !== index);
    updateSettings({ entities: updatedEntities });
  };

  const handleToolsChange = (selectedToolNames: string[]) => {
    if (!settings) return;

    const updatedToolSelections = settings.toolSelections.map((tool) => ({
      ...tool,
      isEnabled: selectedToolNames.includes(tool.toolName)
    }));
    updateSettings({ toolSelections: updatedToolSelections });
  };

  const handleSelectForMe = () => {
    if (!settings) return;

    // Clear entities and set autoSelectEntities flag
    updateSettings({
      entities: [],
      autoSelectEntities: true
    });
  };

  const handleStartInvestigation = async () => {
    if (!canStartInvestigation) return;

    try {
      await startInvestigation();

      // Get the CURRENT investigation ID from the wizard store
      const currentState = useWizardStore.getState();
      const investigationId = currentState.wizardState?.investigation_id;

      if (investigationId) {
        const targetUrl = `/investigation/progress?id=${investigationId}`;
        navigate(targetUrl, { replace: true });
        // Navigation handled via URL - no need for goNext()
      } else {
        console.error('❌ [handleStartInvestigation] No investigation ID found! Cannot update URL.');
        console.error('❌ [handleStartInvestigation] wizardState:', currentState.wizardState);
      }
    } catch (error) {
      console.error('❌ [handleStartInvestigation] Error:', error);

      // Show user-friendly error notification instead of just throwing
      let errorMessage = 'Failed to start investigation';
      let errorDescription = 'An unexpected error occurred. Please try again.';

      if (error instanceof WizardStateError) {
        // Use structured error information for better user messaging
        errorMessage = error.message;

        // Provide context-specific error descriptions
        switch (error.code) {
          case 'NETWORK_ERROR':
            errorDescription = 'Unable to reach the server. Please check your connection and try again.';
            break;
          case 'VALIDATION_ERROR':
            errorDescription = 'Invalid investigation settings. Please review your configuration.';
            // Check for specific validation errors
            if (error.message.includes('tool')) {
              errorDescription = 'Please select at least one tool to proceed with the investigation.';
            } else if (error.message.includes('entity')) {
              errorDescription = 'Please add at least one entity or enable auto-select mode.';
            } else if (error.message.includes('time')) {
              errorDescription = 'Please select a valid time range for the investigation.';
            }
            break;
          case 'VERSION_CONFLICT':
            errorDescription = 'The investigation was modified elsewhere. Please refresh and try again.';
            break;
          case 'DUPLICATE_INVESTIGATION':
            errorDescription = 'An investigation with these settings already exists.';
            break;
          default:
            if (error.statusCode && error.statusCode >= 500) {
              errorDescription = 'Server error occurred. Our team has been notified.';
            }
            break;
        }
      } else if (error instanceof Error) {
        // Handle serializer validation errors (thrown before backend call)
        errorMessage = error.message;

        // Provide specific guidance for validation errors
        if (error.message.includes('tool')) {
          errorDescription = 'Please select at least one tool from the Tools Configuration panel before starting the investigation.';
        } else if (error.message.includes('entity')) {
          errorDescription = 'Please add at least one entity or enable auto-select mode in the Entity Selection panel.';
        } else if (error.message.includes('time') || error.message.includes('range')) {
          errorDescription = 'Please select a valid time range for the investigation.';
        }
      }

      // Emit error notification for the UI
      eventBus.emit('ui:notification:show', {
        notification: {
          id: `error_${Date.now()}`,
          type: 'error',
          title: errorMessage,
          message: errorDescription,
          duration: 0 // Don't auto-dismiss errors
        }
      });

      // Don't continue if investigation failed to start
      return;
    }
  };

  const handleInitializeTools = (tools: any[]) => {
    if (!settings) return;

    // Convert EnhancedTool array to ToolSelection array
    // All tools are enabled by default on initialization
    const toolSelections = tools.map((tool, index) => ({
      toolId: tool.id || `tool-${index}`,
      toolName: tool.name || tool.displayName,
      agentId: tool.agentCompatibility?.[0] || 'default-agent',
      agentName: tool.agentCompatibility?.[0] || 'Default Agent',
      priority: tool.priority || 5,
      isEnabled: true
    }));

    updateSettings({ toolSelections });
  };

  return {
    handleEntityAdd,
    handleEntityRemove,
    handleToolsChange,
    handleSelectForMe,
    handleStartInvestigation,
    handleInitializeTools,
    canStartInvestigation
  };
}
