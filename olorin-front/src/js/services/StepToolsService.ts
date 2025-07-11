/**
 * Service for managing step-specific tool selections with session storage overrides.
 */

import { getSessionOverrides, setSessionOverrides } from './SettingsService';
import { Settings } from './SettingsService';

export interface StepToolsMapping {
  [stepId: string]: string[];
}

const STEP_TOOLS_SESSION_KEY = 'olorin_step_tools_session';

/**
 * Get step tools from session storage
 */
export function getStepToolsFromSession(): StepToolsMapping {
  try {
    const stored = sessionStorage.getItem(STEP_TOOLS_SESSION_KEY);
    if (stored) {
      return JSON.parse(stored) as StepToolsMapping;
    }
  } catch (error) {
    console.warn('Failed to parse step tools from session storage:', error);
  }
  return {};
}

/**
 * Set step tools in session storage
 */
export function setStepToolsInSession(stepTools: StepToolsMapping): void {
  try {
    sessionStorage.setItem(STEP_TOOLS_SESSION_KEY, JSON.stringify(stepTools));
  } catch (error) {
    console.warn('Failed to save step tools to session storage:', error);
  }
}

/**
 * Clear step tools from session storage
 */
export function clearStepToolsFromSession(): void {
  try {
    sessionStorage.removeItem(STEP_TOOLS_SESSION_KEY);
  } catch (error) {
    console.warn('Failed to clear step tools from session storage:', error);
  }
}

/**
 * Get tools for a specific step, with fallback logic:
 * 1. Use step-specific selection if user has made changes in this session
 * 2. Fall back to global settings for the agent
 * 3. Default to all tools if no settings exist
 */
export function getToolsForStep(
  stepId: string,
  agentName: string,
  settings: Settings,
  availableTools: string[],
): string[] {
  // Check if user has made step-specific tool selections in this session
  const sessionStepTools = getStepToolsFromSession();
  if (sessionStepTools[stepId]) {
    return sessionStepTools[stepId];
  }

  // Fall back to global agent settings
  if (
    settings.agentToolsMapping[agentName] &&
    settings.agentToolsMapping[agentName].length > 0
  ) {
    return settings.agentToolsMapping[agentName];
  }

  // Default to all available tools if no settings exist
  return availableTools;
}

/**
 * Update tools for a specific step (stores in session)
 */
export function updateStepTools(stepId: string, tools: string[]): void {
  const currentStepTools = getStepToolsFromSession();
  const updatedStepTools = {
    ...currentStepTools,
    [stepId]: tools,
  };
  setStepToolsInSession(updatedStepTools);
}

/**
 * Remove step-specific tools (revert to settings default)
 */
export function removeStepTools(stepId: string): void {
  const currentStepTools = getStepToolsFromSession();
  const { [stepId]: removed, ...remaining } = currentStepTools;
  setStepToolsInSession(remaining);
}

/**
 * Check if a step has session-specific tool overrides
 */
export function hasStepToolOverrides(stepId: string): boolean {
  const sessionStepTools = getStepToolsFromSession();
  return stepId in sessionStepTools;
}

/**
 * Get all steps that have session-specific tool overrides
 */
export function getStepsWithToolOverrides(): string[] {
  const sessionStepTools = getStepToolsFromSession();
  return Object.keys(sessionStepTools);
}

/**
 * Clear all step tool overrides
 */
export function clearAllStepToolOverrides(): void {
  clearStepToolsFromSession();
}
