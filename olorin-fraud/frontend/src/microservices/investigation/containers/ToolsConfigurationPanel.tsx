/**
 * Tools Configuration Panel Container
 * Feature: 004-new-olorin-frontend
 *
 * Olorin-style unified agent and tools configuration panel.
 * Shows all agents with inline tool selection - no multi-step flow.
 * SYSTEM MANDATE compliant: Fetches from API, no mock data.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BulkToolActions,
  ToolCategorySection,
  WizardPanel,
  LoadingSpinner,
  AgentSelectionPanel
} from '@shared/components';
import {
  AgentName,
  AgentConfig,
  EnhancedTool,
  ToolType,
  ToolPriority,
  groupToolsByType,
  getCompatibleTools
} from '@shared/types/agent.types';
import { settingsService } from '@shared/services/settingsService';
import { eventBus } from '@shared/events/UnifiedEventBus';

// Code loaded

export interface ToolsConfigurationPanelProps {
  toolSelections: Array<{
    toolId: string;
    toolName: string;
    agentId: string;
    agentName: string;
    priority: number;
    isEnabled: boolean;
  }>;
  onToolSelectionsChange: (selections: Array<{
    toolId: string;
    toolName: string;
    agentId: string;
    agentName: string;
    priority: number;
    isEnabled: boolean;
  }>) => void;
  onInitializeTools?: (tools: any[]) => void;
  className?: string;
}

/**
 * Main container for Olorin-style unified agent and tools configuration
 * Shows all agents with inline tool selection controls
 */
export const ToolsConfigurationPanel: React.FC<ToolsConfigurationPanelProps> = ({
  toolSelections,
  onToolSelectionsChange,
  onInitializeTools,
  className = ''
}) => {
  const componentIdRef = useRef(`ToolsConfigPanel-${Math.random().toString(36).substr(2, 9)}`);

  // Debug: Log component mount/unmount
  useEffect(() => {
    console.log(`[${componentIdRef.current}] Component MOUNTED`);
    return () => {
      console.log(`[${componentIdRef.current}] Component UNMOUNTED`);
    };
  }, []);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [allTools, setAllTools] = useState<EnhancedTool[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const [isAgentPanelExpanded, setIsAgentPanelExpanded] = useState(true);
  const hasInitializedRef = useRef(false);
  const hasPreselectedToolsRef = useRef(false);
  const hasFetchedDataRef = useRef(false);

  // Auto-expand tool categories when an agent is selected
  useEffect(() => {
    if (selectedAgent) {
      setExpandedCategories({
        olorin_tools: true,
        external_tools: true,
        mcp_tools: true
      });
    }
  }, [selectedAgent]);

  // Map backend agent names to AgentName enum values
  const mapAgentNameToEnum = (backendName: string): AgentName | null => {
    const mapping: Record<string, AgentName> = {
      'Network Agent': AgentName.NETWORK_ANALYSIS,
      'Location Agent': AgentName.LOCATION_ANALYSIS,
      'Device Agent': AgentName.DEVICE_ANALYSIS,
      'Log Agent': AgentName.LOGS_ANALYSIS,
      'Logs Agent': AgentName.LOGS_ANALYSIS,
      'Behavior Agent': AgentName.BEHAVIOR_ANALYSIS,
      'Risk Agent': AgentName.RISK_ASSESSMENT,
      // Also support enum values directly
      'network_analysis': AgentName.NETWORK_ANALYSIS,
      'location_analysis': AgentName.LOCATION_ANALYSIS,
      'device_analysis': AgentName.DEVICE_ANALYSIS,
      'logs_analysis': AgentName.LOGS_ANALYSIS,
      'behavior_analysis': AgentName.BEHAVIOR_ANALYSIS,
      'risk_assessment': AgentName.RISK_ASSESSMENT
    };
    return mapping[backendName] || null;
  };

  // Fetch agents and tools from API
  useEffect(() => {
    const componentId = componentIdRef.current;

    // Guard against multiple fetches (React Strict Mode, parent re-renders)
    if (hasFetchedDataRef.current) {
      console.log(`[${componentId}] Data already fetched, skipping duplicate fetch`);
      return;
    }

    // Set flag immediately to prevent race conditions
    hasFetchedDataRef.current = true;
    console.log(`[${componentId}] Starting fetch (flag set)`);

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch agents, tools, and agent-tools mapping from backend
        console.log(`[${componentId}] Fetching agents, tools, and mappings from API...`);
        const [agentsData, toolsData, agentToolsMapping] = await Promise.all([
          settingsService.getAgents(),
          settingsService.getToolsWithDisplayNames(),
          settingsService.getAgentToolsMapping()
        ]);

        console.log('[ToolsConfigurationPanel] Received agents from API:', agentsData);
        console.log('[ToolsConfigurationPanel] Received tools from API:', toolsData);
        console.log('[ToolsConfigurationPanel] Received agent-tools mapping from API:', agentToolsMapping);

        // Get all tool names as fallback
        const allToolNames = toolsData.map((tool) => tool.name);

        // Convert API data to AgentConfig format
        const agentConfigs: AgentConfig[] = agentsData
          .map((backendAgentName) => {
            const enumValue = mapAgentNameToEnum(backendAgentName);
            if (!enumValue) {
              console.warn(`[ToolsConfigurationPanel] Unknown agent name from API: ${backendAgentName}`);
              return null;
            }

            // Get compatible tools from server mapping, fallback to all tools
            const compatibleTools = agentToolsMapping[backendAgentName] || allToolNames;

            const config = {
              name: enumValue,
              displayName: backendAgentName,
              description: `${backendAgentName} specializes in analyzing and detecting fraud patterns`,
              icon: '🤖',
              enabled: true,
              compatibleTools: compatibleTools,
              recommendedTools: compatibleTools.slice(0, Math.min(5, compatibleTools.length)),
              executionOrder: 0
            } as AgentConfig;

            console.log('[ToolsConfigurationPanel] Mapped agent:', backendAgentName, '→', config);
            console.log('[ToolsConfigurationPanel] Compatible tools for', backendAgentName, ':', compatibleTools.length);
            return config;
          })
          .filter((config): config is AgentConfig => config !== null);

        console.log('[ToolsConfigurationPanel] Final agentConfigs array:', agentConfigs);

        // Convert API tools to EnhancedTool format
        // Map compatible agents to enum values
        const compatibleAgentEnums = agentConfigs.map((config) => config.name);

        // De-duplicate tools by name (keep first occurrence)
        const uniqueToolsMap = new Map<string, any>();
        toolsData.forEach((tool) => {
          if (!uniqueToolsMap.has(tool.name)) {
            uniqueToolsMap.set(tool.name, tool);
          }
        });
        const uniqueTools = Array.from(uniqueToolsMap.values());

        console.log('[ToolsConfigurationPanel] De-duplicated tools:', toolsData.length, '→', uniqueTools.length);

        const enhancedTools: EnhancedTool[] = uniqueTools.map((tool) => {
          // Handle missing category
          const category = tool.category || 'Unknown';
          const categoryLower = category.toLowerCase();

          return {
            id: tool.name,
            name: tool.name,
            displayName: tool.display_name,
            description: tool.description || '',
            category: category,
            enabled: true,
            toolType: categoryLower.includes('mcp')
              ? ToolType.MCP_TOOL
              : ToolType.OLORIN_TOOL,
            priority: ToolPriority.MEDIUM,
            agentCompatibility: compatibleAgentEnums,
            executionTimeEstimateMs: 2000,
            requiresConfiguration: false
          };
        });

        // Check for PostgreSQL and Snowflake tools
        const hasPostgres = enhancedTools.some(t =>
          (t.name && t.name.toLowerCase().includes('postgres')) ||
          (t.displayName && t.displayName.toLowerCase().includes('postgres'))
        );
        const hasSnowflake = enhancedTools.some(t =>
          (t.name && t.name.toLowerCase().includes('snowflake')) ||
          (t.displayName && t.displayName.toLowerCase().includes('snowflake'))
        );

        if (!hasPostgres) {
          console.warn('[ToolsConfigurationPanel] PostgreSQL tool not found in API response');
        }
        if (!hasSnowflake) {
          console.warn('[ToolsConfigurationPanel] Snowflake tool not found in API response');
        }

        console.log('[ToolsConfigurationPanel] Setting agents state with', agentConfigs.length, 'agents');
        console.log('[ToolsConfigurationPanel] Setting tools state with', enhancedTools.length, 'tools');

        setAgents(agentConfigs);
        setAllTools(enhancedTools);

        // Auto-select all tools from backend agent-tools mapping if not already selected
        // eslint-disable-next-line react-hooks/exhaustive-deps
        if (agentConfigs.length > 0 && enhancedTools.length > 0 && toolSelections.length === 0 && !hasPreselectedToolsRef.current) {
          console.log('[ToolsConfigurationPanel] Auto-selecting all tools from backend agent-tools mapping');

          const defaultSelections: typeof toolSelections = [];

          // For each agent, select all its compatible tools from the backend mapping
          agentConfigs.forEach(agent => {
            agent.compatibleTools.forEach(toolName => {
              const tool = enhancedTools.find(t => t.name === toolName);
              if (tool) {
                defaultSelections.push({
                  toolId: tool.id,
                  toolName: tool.name,
                  agentId: agent.name,
                  agentName: agent.displayName,
                  priority: 5,
                  isEnabled: true
                });
              }
            });
          });

          if (defaultSelections.length > 0) {
            hasPreselectedToolsRef.current = true;
            onToolSelectionsChange(defaultSelections);
            console.log('[ToolsConfigurationPanel] Pre-selected', defaultSelections.length, 'tool selections from backend mapping');
          }
        }

        console.log('[ToolsConfigurationPanel] State updated successfully');
      } catch (error) {
        console.error('[ToolsConfigurationPanel] Failed to fetch agents and tools:', error);

        // Show user-friendly error notification
        let errorMessage = 'Failed to Load Tools Configuration';
        let errorDescription = 'Unable to load available agents and tools. Please try refreshing the page.';

        if (error instanceof Error) {
          if (error.message.includes('Network') || error.message.includes('fetch')) {
            errorDescription = 'Unable to reach the server. Please check your connection and try again.';
          } else if (error.message.includes('timeout')) {
            errorDescription = 'The request took too long to complete. Please try again.';
          }
        }

        // Emit error notification for the UI
        console.log('[ToolsConfigPanel] Emitting error notification:', { errorMessage, errorDescription });
        eventBus.emit('ui:notification:show', {
          notification: {
            id: `tools_config_error_${Date.now()}`,
            type: 'error',
            title: errorMessage,
            message: errorDescription,
            duration: 0 // Don't auto-dismiss errors
          }
        });
        console.log('[ToolsConfigPanel] Error notification emitted');

        // Set empty state so UI doesn't crash
        setAgents([]);
        setAllTools([]);
      } finally {
        console.log('[ToolsConfigurationPanel] Setting isLoading to false');
        setIsLoading(false);
      }
    };

    // Call fetchData - guard above ensures this only runs once
    fetchData();
  }, []);

  // Initialize tools in settings when they are fetched
  useEffect(() => {
    if (allTools.length > 0 && !hasInitializedRef.current && onInitializeTools) {
      hasInitializedRef.current = true;
      console.log('[ToolsConfigurationPanel] Initializing tools in settings with', allTools.length, 'tools');
      onInitializeTools(allTools);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTools]); // Only run when allTools changes - onInitializeTools is stable

  // Get available tools based on selected agent
  const availableTools = useMemo(() => {
    return selectedAgent ? getCompatibleTools(allTools, selectedAgent) : allTools;
  }, [selectedAgent, allTools]);

  // Group tools by type
  const toolsByType = useMemo(() => {
    return groupToolsByType(availableTools);
  }, [availableTools]);

  // Get agent-specific data
  const selectedAgentConfig = useMemo(() => {
    return agents.find((a) => a.name === selectedAgent) || null;
  }, [selectedAgent, agents]);

  // Get selected tools for the current agent (per-agent tool selections)
  const selectedToolsForAgent = useMemo(() => {
    if (!selectedAgent || !selectedAgentConfig) return [];

    // Filter tool selections for this specific agent
    return toolSelections
      .filter((sel) => sel.agentId === selectedAgentConfig.name && sel.isEnabled)
      .map((sel) => sel.toolName);
  }, [selectedAgent, selectedAgentConfig, toolSelections]);

  // Calculate statistics (commented out as unused but may be needed in future)
  // const stats = useMemo(() => {
  //   const olorinTools = availableTools.filter((t) => t.toolType === ToolType.OLORIN_TOOL);
  //   const externalTools = availableTools.filter((t) => t.toolType === ToolType.EXTERNAL_TOOL);
  //   const mcpTools = availableTools.filter((t) => t.toolType === ToolType.MCP_TOOL);

  //   return {
  //     total: availableTools.length,
  //     selected: selectedToolsForAgent.length,
  //     olorin: olorinTools.length,
  //     external: externalTools.length,
  //     mcp: mcpTools.length
  //   };
  // }, [availableTools, selectedToolsForAgent]);

  const handleToolToggle = (toolName: string) => {
    if (!selectedAgent || !selectedAgentConfig) return;

    const existingSelection = toolSelections.find(
      (sel) => sel.agentId === selectedAgentConfig.name && sel.toolName === toolName
    );

    let newSelections: typeof toolSelections;

    if (existingSelection) {
      // Toggle existing selection
      newSelections = toolSelections.map((sel) =>
        sel.agentId === selectedAgentConfig.name && sel.toolName === toolName
          ? { ...sel, isEnabled: !sel.isEnabled }
          : sel
      );
    } else {
      // Add new selection for this agent-tool combination
      const tool = availableTools.find((t) => t.name === toolName);
      if (!tool) return;

      newSelections = [
        ...toolSelections,
        {
          toolId: tool.id,
          toolName: tool.name,
          agentId: selectedAgentConfig.name,
          agentName: selectedAgentConfig.displayName,
          priority: 5,
          isEnabled: true
        }
      ];
    }

    onToolSelectionsChange(newSelections);
  };

  const handleSelectAll = () => {
    if (!selectedAgent || !selectedAgentConfig) return;

    const newSelections = [
      ...toolSelections.filter((sel) => sel.agentId !== selectedAgentConfig.name),
      ...availableTools.map((tool) => ({
        toolId: tool.id,
        toolName: tool.name,
        agentId: selectedAgentConfig.name,
        agentName: selectedAgentConfig.displayName,
        priority: 5,
        isEnabled: true
      }))
    ];

    onToolSelectionsChange(newSelections);
  };

  const handleSelectNone = () => {
    if (!selectedAgent || !selectedAgentConfig) return;

    // Remove all selections for this agent
    const newSelections = toolSelections.filter((sel) => sel.agentId !== selectedAgentConfig.name);
    onToolSelectionsChange(newSelections);
  };

  const handleSelectRecommended = () => {
    if (!selectedAgent || !selectedAgentConfig) return;

    // Select all tools for the agent (no recommendation logic for now)
    handleSelectAll();
  };

  const handleSelectOlorinOnly = () => {
    if (!selectedAgent || !selectedAgentConfig) return;

    const olorinTools = availableTools.filter((t) => t.toolType === ToolType.OLORIN_TOOL);

    const newSelections = [
      ...toolSelections.filter((sel) => sel.agentId !== selectedAgentConfig.name),
      ...olorinTools.map((tool) => ({
        toolId: tool.id,
        toolName: tool.name,
        agentId: selectedAgentConfig.name,
        agentName: selectedAgentConfig.displayName,
        priority: 5,
        isEnabled: true
      }))
    ];

    onToolSelectionsChange(newSelections);
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Show loading state while fetching
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" message="Loading tools and agents..." />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Agent Selection Section */}
      <WizardPanel
        title="Select Investigation Agents"
        isExpanded={isAgentPanelExpanded}
        onToggle={() => setIsAgentPanelExpanded(!isAgentPanelExpanded)}
      >
        <AgentSelectionPanel
          agents={agents}
          selectedAgent={selectedAgent}
          onAgentSelect={setSelectedAgent}
        />
      </WizardPanel>

      {/* Bulk Actions */}
      {selectedAgent && (
        <BulkToolActions
          availableTools={availableTools}
          selectedTools={selectedToolsForAgent}
          onSelectAll={handleSelectAll}
          onSelectNone={handleSelectNone}
          onSelectRecommended={handleSelectRecommended}
          onSelectOlorinOnly={handleSelectOlorinOnly}
          agentName={selectedAgent}
          agentConfig={selectedAgentConfig}
        />
      )}

      {/* Tool Categories */}
      {selectedAgent && (
        <div className="space-y-4">
          {/* Olorin Tools */}
          {toolsByType[ToolType.OLORIN_TOOL] && toolsByType[ToolType.OLORIN_TOOL].length > 0 && (
            <ToolCategorySection
              categoryName="olorin_tools"
              categoryTitle="Olorin Enterprise Tools"
              tools={toolsByType[ToolType.OLORIN_TOOL]}
              selectedTools={selectedToolsForAgent}
              onToolToggle={handleToolToggle}
              isExpanded={expandedCategories['olorin_tools'] ?? true}
              onToggleExpansion={() => toggleCategoryExpansion('olorin_tools')}
              agentName={selectedAgent}
            />
          )}

          {/* External Tools */}
          {toolsByType[ToolType.EXTERNAL_TOOL] &&
            toolsByType[ToolType.EXTERNAL_TOOL].length > 0 && (
              <ToolCategorySection
                categoryName="external_tools"
                categoryTitle="External Tools"
                tools={toolsByType[ToolType.EXTERNAL_TOOL]}
                selectedTools={selectedToolsForAgent}
                onToolToggle={handleToolToggle}
                isExpanded={expandedCategories['external_tools'] ?? true}
                onToggleExpansion={() => toggleCategoryExpansion('external_tools')}
                agentName={selectedAgent}
              />
            )}

          {/* MCP Tools */}
          {toolsByType[ToolType.MCP_TOOL] && toolsByType[ToolType.MCP_TOOL].length > 0 && (
            <ToolCategorySection
              categoryName="mcp_tools"
              categoryTitle="MCP Tools"
              tools={toolsByType[ToolType.MCP_TOOL]}
              selectedTools={selectedToolsForAgent}
              onToolToggle={handleToolToggle}
              isExpanded={expandedCategories['mcp_tools'] ?? true}
              onToggleExpansion={() => toggleCategoryExpansion('mcp_tools')}
              agentName={selectedAgent}
            />
          )}
        </div>
      )}

      {/* No Agent Selected State */}
      {!selectedAgent && (
        <div className="text-center py-12 bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg">
          <span className="text-4xl mb-4 block">🤖</span>
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">
            Select an Investigation Agent
          </h3>
          <p className="text-sm text-corporate-textSecondary max-w-md mx-auto">
            Choose an agent above to configure its investigation tools. Each agent specializes in
            different aspects of fraud detection.
          </p>
        </div>
      )}
    </div>
  );
};

export default ToolsConfigurationPanel;
