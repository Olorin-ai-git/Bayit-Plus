/**
 * Default Investigation Tools
 * Feature: 004-new-olorin-frontend
 *
 * Fetches OLORIN tools from backend API and maps to wizard format.
 * SYSTEM MANDATE compliant: Uses real API calls, no mock data.
 */

import { InvestigationTool, ToolCategory } from '@shared/components/ToolMatrix';
import { settingsService } from '@shared/services/settingsService';

const CATEGORY_MAP: Record<string, ToolCategory> = {
  'Device Analysis': ToolCategory.DEVICE_ANALYSIS,
  'device': ToolCategory.DEVICE_ANALYSIS,
  'Location Analysis': ToolCategory.LOCATION_ANALYSIS,
  'location': ToolCategory.LOCATION_ANALYSIS,
  'Network Analysis': ToolCategory.NETWORK_ANALYSIS,
  'network': ToolCategory.NETWORK_ANALYSIS,
  'Behavior Analysis': ToolCategory.BEHAVIOR_ANALYSIS,
  'behavior': ToolCategory.BEHAVIOR_ANALYSIS,
  'Logs Analysis': ToolCategory.LOGS_ANALYSIS,
  'logs': ToolCategory.LOGS_ANALYSIS,
  'Risk Assessment': ToolCategory.RISK_ASSESSMENT,
  'risk': ToolCategory.RISK_ASSESSMENT
};

/**
 * Fetch tools from backend API
 */
export async function fetchToolsFromAPI(): Promise<InvestigationTool[]> {
  try {
    const toolsData = await settingsService.getToolsWithDisplayNames();

    return toolsData.map((tool, index) => {
      // Normalize category name - handle missing category
      const rawCategory = tool.category || 'device';
      const categoryKey = rawCategory.toLowerCase();
      const category = CATEGORY_MAP[categoryKey] || CATEGORY_MAP[rawCategory] || ToolCategory.DEVICE_ANALYSIS;

      return {
        id: `tool-${index + 1}`,
        name: tool.display_name || tool.name,
        description: tool.description || '',
        category,
        enabled: true
      };
    });
  } catch (error) {
    console.error('Failed to fetch tools from API:', error);
    // Return empty array on error - don't use mock data
    return [];
  }
}

/**
 * Get default tools (synchronous version for backward compatibility)
 * Returns empty array initially - use fetchToolsFromAPI() for actual data
 */
export function getDefaultTools(): InvestigationTool[] {
  // Return empty array - actual tools should be fetched asynchronously
  return [];
}
