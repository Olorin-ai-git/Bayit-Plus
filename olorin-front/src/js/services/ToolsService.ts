/**
 * Service for fetching available tools from the server
 */

import { isDemoModeActive } from '../utils/urlParams';

export interface ToolInfo {
  name: string;
  description: string;
  category: string;
  schema?: any;
}

/**
 * Fetch available tools from the MCP API
 */
export async function fetchAvailableTools(): Promise<string[]> {
  // Check for demo mode - use default tools without API calls
  if (isDemoModeActive()) {
    console.log('Demo mode active - using default tools');
    // Simulate network delay for realistic demo experience
    await new Promise(resolve => setTimeout(resolve, 100));
    return getDefaultTools();
  }

  try {
    const response = await fetch('/api/mcp/tools');
    if (!response.ok) {
      throw new Error(`Failed to fetch tools: ${response.status}`);
    }
    
    const tools: ToolInfo[] = await response.json();
    
    // Extract tool names and format them for display
    const toolNames = tools.map(tool => {
      // Convert tool names to display format
      const name = tool.name;
      if (name.includes('splunk')) return 'Splunk';
      if (name.includes('oii') || name === 'identity_verification') return 'OII';
      if (name.includes('di_tool') || name.includes('di_bb')) return 'DI BB';
      if (name.includes('data_lake') || name.includes('datalake')) return 'DATA LAKE';
      if (name.includes('vector_search')) return 'Vector Search';
      if (name.includes('web_search')) return 'Web Search';
      if (name.includes('database')) return 'Database';
      
      // Fraud investigation tools mapping
      if (name === 'transaction_analysis') return 'Transaction Analysis';
      if (name === 'account_behavior') return 'Account Behavior';
      if (name === 'identity_verification') return 'Identity Verification';
      if (name === 'payment_intelligence') return 'Payment Intelligence';
      if (name === 'ato_detection') return 'ATO Detection';
      if (name === 'fraud_scoring') return 'Fraud Scoring';
      if (name === 'graph_analysis') return 'Graph Analysis';
      if (name === 'sanctions_screening') return 'Sanctions Screening';
      if (name === 'digital_footprint') return 'Digital Footprint';
      if (name === 'communication_analysis') return 'Communication Analysis';
      if (name === 'temporal_analysis') return 'Temporal Analysis';
      if (name === 'merchant_intelligence') return 'Merchant Intelligence';
      
      // Additional MCP tools
      if (name === 'data_lake_query') return 'Data Lake Query';
      if (name === 'case_management') return 'Case Management';
      if (name === 'regulatory_reporting') return 'Regulatory Reporting';
      if (name === 'external_api_enrichment') return 'External API Enrichment';
      if (name === 'blockchain_explorer') return 'Blockchain Explorer';
      if (name === 'dark_web_monitoring') return 'Dark Web Monitoring';
      
      // Default: capitalize first letter and replace underscores
      return name.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    });
    
    // Remove duplicates and sort
    const uniqueTools = Array.from(new Set(toolNames)).sort();
    console.log('Successfully fetched tools from MCP API:', uniqueTools);
    return uniqueTools;
    
  } catch (err) {
    console.warn('MCP backend unavailable, using default tools. Error:', err);
    
    // Fallback to hardcoded tools if API fails - this prevents proxy errors
    const defaultTools = getDefaultTools();
    console.log('Using fallback tools:', defaultTools);
    return defaultTools;
  }
}

/**
 * Get the default tools list (fallback when server is unavailable)
 */
export function getDefaultTools(): string[] {
  return [
    // Original tools
    'Splunk', 'OII', 'DI BB', 'DATA LAKE', 'Vector Search', 'Web Search',
    // Fraud investigation tools
    'Transaction Analysis', 'Account Behavior', 'Identity Verification',
    'Payment Intelligence', 'ATO Detection', 'Fraud Scoring',
    'Graph Analysis', 'Sanctions Screening', 'Digital Footprint',
    'Communication Analysis', 'Temporal Analysis', 'Merchant Intelligence',
    // Additional MCP tools
    'Data Lake Query', 'Case Management', 'Regulatory Reporting',
    'External API Enrichment', 'Blockchain Explorer', 'Dark Web Monitoring'
  ];
} 