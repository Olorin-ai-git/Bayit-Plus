import { useState, useEffect } from 'react';
import { useSettings } from './useSettings';
import { fetchAvailableTools } from '../services/ToolsService';
import { 
  getToolsForStep as getToolsForStepService,
  updateStepTools,
  hasStepToolOverrides,
  getStepToolsFromSession,
  StepToolsMapping
} from '../services/StepToolsService';

/**
 * Hook to manage step-specific tool selections with server settings integration.
 * This integrates with the global settings system and uses session storage for temporary overrides.
 * 
 * @returns [getToolsForStep, setToolsForStep, availableTools, isLoading, error, hasOverrides]
 */
export function useStepTools(): [
  (stepId: string, agentName: string) => string[],
  (stepId: string, tools: string[]) => void,
  string[],
  boolean,
  string | null,
  (stepId: string) => boolean
] {
  const [settings] = useSettings();
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available tools from the server
  useEffect(() => {
    const loadTools = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const tools = await fetchAvailableTools();
        setAvailableTools(tools);
        
      } catch (err) {
        console.error('Error loading tools:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tools');
      } finally {
        setIsLoading(false);
      }
    };

    loadTools();
  }, []);

  /**
   * Get tools for a specific step, with fallback logic:
   * 1. Use step-specific selection if user has made changes in this session
   * 2. Fall back to global settings for the agent
   * 3. Default to all tools if no settings exist
   */
  const getToolsForStep = (stepId: string, agentName: string): string[] => {
    return getToolsForStepService(stepId, agentName, settings, availableTools);
  };

  /**
   * Set tools for a specific step (stores in session storage as override)
   */
  const setToolsForStep = (stepId: string, tools: string[]): void => {
    updateStepTools(stepId, tools);
  };

  /**
   * Check if a step has session-specific tool overrides
   */
  const hasOverrides = (stepId: string): boolean => {
    return hasStepToolOverrides(stepId);
  };

  return [
    getToolsForStep,
    setToolsForStep,
    availableTools,
    isLoading,
    error,
    hasOverrides
  ];
} 