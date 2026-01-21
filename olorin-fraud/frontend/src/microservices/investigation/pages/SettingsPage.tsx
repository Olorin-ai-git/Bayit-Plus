/**
 * Investigation Settings Page
 * Features: 004-new-olorin-frontend, 006-hybrid-graph-integration
 *
 * Step 1 of 3-step Investigation Wizard.
 * Supports both structured investigations (004) and hybrid graph investigations (006).
 *
 * Tasks T020, T025: Hybrid graph toggle, settings form, and navigation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizardStore } from '@shared/store/wizardStore';
import {
  WizardPanel,
  TemplateSelector,
  EntityInput,
  EntityList,
  TimeRangePicker,
  ValidationSidebar,
  InvestigationModeSwitch
} from '@shared/components';
import type { InvestigationMode } from '@shared/components';
import { ToolsConfigurationPanel } from '../containers/ToolsConfigurationPanel';

// Feature 006: Hybrid Graph Integration
import { LoadingState } from '../components/settings/LoadingState';
import { InvestigationTypeToggle, InvestigationType } from '../components/settings/InvestigationTypeToggle';
import { HybridGraphSettings } from '../components/settings/HybridGraphSettings';
import { ToolMatrixSelector } from '../components/settings/ToolMatrixSelector';
import { useSettingsHandlers } from '../hooks/useSettingsHandlers';
import { createDefaultSettings } from '../utils/defaultSettings';
import { validateConfig } from '../validation/configValidator';
import { investigationService } from '../services/investigationService';
import { getBooleanConfig } from '../../../shared/config/runtimeConfig';
import type { EntityType } from '../types/hybridGraphTypes';
import { useEventBus } from '@shared/events/UnifiedEventBus';
import { clearBrowserCache, clearInvestigationCache } from '@shared/utils/cacheManager';
import { generateInvestigationId } from '@shared/utils/idGenerator';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const eventBus = useEventBus(); // Get EventBus from React Context
  const settings = useWizardStore((state) => state.settings);
  const updateSettings = useWizardStore((state) => state.updateSettings);

  // Feature flag for hybrid graph
  const hybridGraphEnabled = getBooleanConfig('REACT_APP_FEATURE_ENABLE_HYBRID_GRAPH', true);

  // Investigation mode state (risk-based vs specific entity)
  const [investigationMode, setInvestigationMode] = useState<InvestigationMode>('risk-based');

  // Investigation type state (hybrid graph vs structured)
  // Default to hybrid-graph as requested
  const [investigationType, setInvestigationType] = useState<InvestigationType>('hybrid-graph');
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Handle investigation mode changes and update autoSelectEntities setting
  const handleInvestigationModeChange = (mode: InvestigationMode) => {
    setInvestigationMode(mode);
    updateSettings({ autoSelectEntities: mode === 'risk-based' });
  };

  // Hybrid graph configuration state
  const [hybridConfig, setHybridConfig] = useState<{
    entityType: EntityType;
    entityId: string;
    timeRange: { start: string; end: string };
  } | null>(null);

  const [hybridTools, setHybridTools] = useState<
    Array<{ tool_id: string; parameters?: Record<string, unknown> }>
  >([]);

  const [expandedPanels, setExpandedPanels] = useState({
    template: true,
    entities: true,
    timeRange: true,
    tools: true,
    advanced: false,
    hybridGraph: true
  });

  const {
    handleEntityAdd,
    handleEntityRemove,
    handleStartInvestigation,
    canStartInvestigation
  } = useSettingsHandlers();

  // Initialize default settings
  useEffect(() => {
    const initializeSettings = async () => {
      if (!settings) {
        const defaultSettings = await createDefaultSettings();
        updateSettings(defaultSettings);
      }
    };

    initializeSettings();
  }, [settings, updateSettings]);

  // Sync investigation mode with autoSelectEntities setting
  useEffect(() => {
    if (settings?.autoSelectEntities && investigationMode !== 'risk-based') {
      setInvestigationMode('risk-based');
    } else if (!settings?.autoSelectEntities && investigationMode !== 'specific') {
      setInvestigationMode('specific');
    }
  }, [settings?.autoSelectEntities, investigationMode]);

  const togglePanel = (panel: keyof typeof expandedPanels) => {
    setExpandedPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  // Memoize tool selections callback to prevent unnecessary re-renders
  const handleToolSelectionsChange = useCallback((selections: Array<{
    toolId: string;
    toolName: string;
    agentId: string;
    agentName: string;
    priority: number;
    isEnabled: boolean;
  }>) => {
    updateSettings({ toolSelections: selections });
  }, [updateSettings]);

  // Validation for structured mode
  const validationItems = [
    {
      id: 'entities',
      label: 'Entities',
      // Entities only required for specific (entity-based) investigations
      // Risk-based investigations (autoSelectEntities=true) don't require manual entity selection
      isValid: investigationMode === 'risk-based' || (!!settings?.entities && settings.entities.length > 0),
      message: investigationMode === 'risk-based'
        ? 'Auto-selection enabled'
        : settings?.entities?.length
        ? `${settings.entities.length} entity(ies) added`
        : 'At least one entity required',
      severity: 'error' as const
    },
    {
      id: 'timeRange',
      label: 'Time Range',
      isValid: !!settings?.timeRange,
      message: settings?.timeRange ? 'Valid' : 'Time range required',
      severity: 'error' as const
    },
    {
      id: 'tools',
      label: 'Investigation Tools',
      isValid: !!settings?.toolSelections && settings.toolSelections.filter((t: { isEnabled: boolean }) => t.isEnabled).length > 0,
      message: settings?.toolSelections
        ? `${settings.toolSelections.filter((t: { isEnabled: boolean }) => t.isEnabled).length} tool(s) selected`
        : 'At least one tool required',
      severity: 'error' as const
    }
  ];

  // Validation for hybrid graph mode (T025)
  const canLaunchHybridInvestigation = (): boolean => {
    // In risk-based mode, entity configuration is automatic
    if (investigationMode === 'risk-based') {
      // Only require time range to be configured
      if (!settings?.timeRange) return false;
      // Tools are optional in hybrid graph (LLM chooses them)
      return true;
    }

    // In specific entity mode, require manual entity configuration
    if (!hybridConfig) return false;
    if (!hybridConfig.entityId || !hybridConfig.timeRange.start || !hybridConfig.timeRange.end) {
      return false;
    }

    const validationResult = validateConfig({
      entity_type: hybridConfig.entityType,
      entity_id: hybridConfig.entityId,
      time_range: hybridConfig.timeRange,
      tools: hybridTools
    });

    return validationResult.isValid;
  };

  // Launch hybrid graph investigation (T025)
  const handleLaunchHybridInvestigation = async () => {
    setIsLaunching(true);
    setLaunchError(null);

    try {
      // STEP 1: Clear browser cache before starting new investigation
      // This ensures fresh data and prevents stale state from previous investigations
      console.log('[SettingsPage] Clearing browser cache before investigation launch...');
      await clearBrowserCache();
      console.log('[SettingsPage] Browser cache cleared successfully');

      // STEP 2: Generate unique investigation ID using configuration-driven generator
      // Uses crypto.getRandomValues for collision-resistant IDs
      const investigationId = generateInvestigationId();
      console.log('[SettingsPage] Generated investigation ID:', investigationId);

      // In risk-based mode, use auto-selection configuration
      if (investigationMode === 'risk-based') {
        await investigationService.createInvestigation({
          id: investigationId,
          entityType: 'auto',
          entityId: 'risk-based-auto',
          timeRange: settings.timeRange,
          tools: [],
          autoSelectEntities: true,
          investigationType: investigationType // Feature 006: Pass investigation type to backend
        });

        navigate(`/investigation/progress?id=${investigationId}`);
        return;
      }

      // In specific entity mode, require manual configuration
      if (!hybridConfig) return;

      await investigationService.createInvestigation({
        id: investigationId,
        entityType: hybridConfig.entityType,
        entityId: hybridConfig.entityId,
        timeRange: hybridConfig.timeRange,
        tools: hybridTools,
        investigationType: investigationType // Feature 006: Pass investigation type to backend
      });

      // Navigate to Progress Page with investigation ID (T025)
      navigate(`/investigation/progress?id=${investigationId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to launch investigation';
      setLaunchError(errorMessage);
      console.error('[SettingsPage] Failed to launch hybrid investigation:', error);

      // Show user-friendly error notification
      let errorTitle = 'Failed to Launch Investigation';
      let errorDescription = 'Unable to start the investigation. Please try again.';

      if (error instanceof Error) {
        // Check for validation errors
        if (error.message.includes('422') || error.message.includes('Unprocessable')) {
          errorTitle = 'Invalid Investigation Configuration';
          errorDescription = 'Please check that all required fields are filled correctly. For structured investigations, at least one tool must be selected.';
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          errorDescription = 'Unable to reach the server. Please check your connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorDescription = 'The request took too long to complete. Please try again.';
        } else if (error.message.includes('tool')) {
          errorDescription = 'Please select at least one tool from the Tools Configuration panel.';
        } else if (error.message.includes('entity')) {
          errorDescription = 'Please configure at least one entity or enable risk-based auto-selection.';
        } else if (error.message.includes('time') || error.message.includes('range')) {
          errorDescription = 'Please select a valid time range for the investigation.';
        }
      }

      // Emit error notification for the UI
      console.log('[SettingsPage] Emitting error notification:', { errorTitle, errorDescription });
      eventBus.emit('ui:notification:show', {
        notification: {
          id: `hybrid_launch_error_${Date.now()}`,
          type: 'error',
          title: errorTitle,
          message: errorDescription,
          duration: 0 // Don't auto-dismiss errors
        }
      });
      console.log('[SettingsPage] Error notification emitted');
    } finally {
      setIsLaunching(false);
    }
  };

  if (!settings) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-corporate-textPrimary mb-6">
          Investigation Settings
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto wizard-scrollable">
            {/* Investigation Type Toggle (T020) - Always visible when feature enabled */}
            {hybridGraphEnabled && (
              <WizardPanel
                title="Investigation Type"
                isExpanded={true}
                onToggle={() => {}}
              >
                <InvestigationTypeToggle
                  investigationType={investigationType}
                  onTypeChange={setInvestigationType}
                />
              </WizardPanel>
            )}

            {/* Investigation Mode Panel - Always visible for both investigation types */}
            <WizardPanel
              title="Investigation Mode"
              isExpanded={true}
              onToggle={() => {}}
            >
              <InvestigationModeSwitch
                mode={investigationMode}
                onChange={handleInvestigationModeChange}
              />
            </WizardPanel>

            {/* Template Panel - Always visible for both investigation types */}
            <WizardPanel
              title="Template"
              isExpanded={expandedPanels.template}
              onToggle={() => togglePanel('template')}
              className={investigationMode === 'risk-based' ? 'opacity-50 pointer-events-none' : ''}
            >
              <TemplateSelector
                onTemplateSelect={(template) => {
                  if (template) {
                    updateSettings(template.settings);
                  }
                }}
              />
            </WizardPanel>

            {/* Hybrid Graph Configuration - Only visible for hybrid-graph type and specific entity mode */}
            {investigationType === 'hybrid-graph' && hybridGraphEnabled && investigationMode === 'specific' && (
              <WizardPanel
                title="Hybrid Graph Configuration"
                isExpanded={expandedPanels.hybridGraph}
                onToggle={() => togglePanel('hybridGraph')}
              >
                <HybridGraphSettings
                  onConfigChange={setHybridConfig}
                  disabled={isLaunching}
                />
              </WizardPanel>
            )}

            {/* Risk-based mode message for hybrid graph */}
            {investigationType === 'hybrid-graph' && hybridGraphEnabled && investigationMode === 'risk-based' && (
              <WizardPanel
                title="Entities"
                isExpanded={true}
                onToggle={() => {}}
                className="opacity-50 pointer-events-none"
              >
                <div className="text-center py-6 text-corporate-textTertiary">
                  <p className="text-sm">Manual entity selection is not available in risk-based mode</p>
                  <p className="text-xs mt-2">System will automatically identify and investigate high-risk entities</p>
                </div>
              </WizardPanel>
            )}

            {/* Entities Panel - Only visible for structured type */}
            {investigationType === 'structured' && (
              <WizardPanel
                title="Entities"
                isExpanded={expandedPanels.entities}
                onToggle={() => togglePanel('entities')}
                className={investigationMode === 'risk-based' ? 'opacity-50 pointer-events-none' : ''}
              >
                {investigationMode === 'risk-based' ? (
                  <div className="text-center py-6 text-corporate-textTertiary">
                    <p className="text-sm">Manual entity selection is not available in risk-based mode</p>
                    <p className="text-xs mt-2">System will automatically investigate high-risk entities</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <EntityInput
                      onEntityAdd={handleEntityAdd}
                      currentEntityCount={settings.entities.length}
                    />
                    <EntityList entities={settings.entities} onEntityRemove={handleEntityRemove} />
                  </div>
                )}
              </WizardPanel>
            )}

            {/* Time Range Panel - Always visible for both investigation types */}
            <WizardPanel
              title="Time Range"
              isExpanded={expandedPanels.timeRange}
              onToggle={() => togglePanel('timeRange')}
            >
              <TimeRangePicker
                value={settings.timeRange}
                onChange={(range) => updateSettings({ timeRange: range })}
              />
            </WizardPanel>

            {/* Tool Selection - Only visible for structured type, hidden for hybrid-graph */}
            {/* Hybrid graph lets the LLM choose which tools to trigger automatically */}
            {investigationType === 'structured' && (
              <ToolsConfigurationPanel
                toolSelections={settings.toolSelections || []}
                onToolSelectionsChange={handleToolSelectionsChange}
              />
            )}

            {/* Error Display */}
            {launchError && (
              <div className="bg-corporate-error/20 border border-corporate-error rounded-lg p-4">
                <p className="text-red-300 text-sm">{launchError}</p>
              </div>
            )}
          </div>

          {/* Right Column - Validation Sidebar */}
          <div className="lg:col-span-1">
            {investigationType === 'hybrid-graph' && hybridGraphEnabled ? (
              <div className="sticky top-4">
                <div className="bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-corporate-textPrimary">
                    Validation Status
                  </h3>

                  {/* Ready to start indicator */}
                  {canLaunchHybridInvestigation() && (
                    <div className="bg-corporate-success/10 border border-corporate-success/40 rounded-lg p-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-corporate-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-corporate-success">Ready to start</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-corporate-textSecondary">Entities</span>
                      <span className={
                        investigationMode === 'risk-based' || hybridConfig
                          ? 'text-corporate-success'
                          : 'text-corporate-textTertiary'
                      }>
                        {investigationMode === 'risk-based'
                          ? '✓ Auto-selection enabled'
                          : hybridConfig
                          ? '✓'
                          : '○'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-corporate-textSecondary">Time Range</span>
                      <span className={settings?.timeRange ? 'text-corporate-success' : 'text-corporate-textTertiary'}>
                        {settings?.timeRange ? '✓ Valid' : '○'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-corporate-textSecondary">Investigation Tools</span>
                      <span className="text-corporate-info text-xs">
                        LLM auto-selects
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleLaunchHybridInvestigation}
                    disabled={!canLaunchHybridInvestigation() || isLaunching}
                    className="w-full px-6 py-3 bg-corporate-accentPrimary text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-corporate-accentPrimaryHover transition-colors"
                  >
                    {isLaunching ? 'Launching...' : 'Launch Investigation'}
                  </button>
                </div>
              </div>
            ) : (
              <ValidationSidebar
                validationItems={validationItems}
                canStartInvestigation={canStartInvestigation}
                onStartInvestigation={handleStartInvestigation}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
