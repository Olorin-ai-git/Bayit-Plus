# Frontend MCP Integration Guide

## 🚀 Overview

The Olorin MCP (Model Context Protocol) server has been migrated to a **sidecar deployment pattern** across all environments. This guide provides frontend developers with everything needed to integrate with the new MCP architecture.

## 🔄 What Changed

### Before (Separate Service)
```javascript
// ❌ OLD - Don't use these URLs anymore
const MCP_URLS = {
  e2e: "https://olorin-mcp-e2e.api.intuit.com:3000",
  prd: "https://olorin-mcp.api.intuit.com:3000"
};
```

### After (Sidecar Integration)
```javascript
// ✅ NEW - Use main API with /mcp/* paths
const BASE_URLS = {
  local: "http://localhost:8000",
  qal: "https://olorin-qal.api.intuit.com",
  e2e: "https://olorin-e2e.api.intuit.com", 
  prf: "https://olorin-prf.api.intuit.com",
  stg: "https://olorin-stg.api.intuit.com",
  prd: "https://olorin.api.intuit.com"
};
```

## 📋 MCP Endpoints

All MCP functionality is now available through the main Olorin API with `/mcp/` prefix:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp/status` | GET | Get MCP server status and capabilities |
| `/mcp/health` | GET | Health check for MCP server |
| `/mcp/tools` | GET | List all available tools |
| `/mcp/tools/{tool_name}/execute` | POST | Execute a specific tool |
| `/mcp/prompts` | GET | List all available prompts |

## 🔧 Frontend Implementation

### Environment Configuration

```javascript
// config/environments.js
export const ENVIRONMENTS = {
  local: {
    apiBase: "http://localhost:8000",
    mcpEnabled: true
  },
  qal: {
    apiBase: "https://olorin-qal.api.intuit.com",
    mcpEnabled: true
  },
  e2e: {
    apiBase: "https://olorin-e2e.api.intuit.com", 
    mcpEnabled: true
  },
  prf: {
    apiBase: "https://olorin-prf.api.intuit.com",
    mcpEnabled: true
  },
  stg: {
    apiBase: "https://olorin-stg.api.intuit.com",
    mcpEnabled: true
  },
  prd: {
    apiBase: "https://olorin.api.intuit.com",
    mcpEnabled: true
  }
};

// Auto-detect environment
export function detectEnvironment() {
  const hostname = window.location.hostname;
  
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'local';
  } else if (hostname.includes('qal')) {
    return 'qal';
  } else if (hostname.includes('e2e')) {
    return 'e2e';
  } else if (hostname.includes('prf')) {
    return 'prf';
  } else if (hostname.includes('stg')) {
    return 'stg';
  } else {
    return 'prd';
  }
}

export const currentEnv = detectEnvironment();
export const config = ENVIRONMENTS[currentEnv];
```

### MCP Client Class

```javascript
// services/MCPClient.js
class MCPClient {
  constructor(environment = 'e2e') {
    this.baseUrl = ENVIRONMENTS[environment].apiBase;
    this.mcpEnabled = ENVIRONMENTS[environment].mcpEnabled;
  }

  /**
   * Get MCP server status and capabilities
   */
  async getStatus() {
    const response = await fetch(`${this.baseUrl}/mcp/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`MCP Status Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all available MCP tools
   */
  async getTools() {
    const response = await fetch(`${this.baseUrl}/mcp/tools`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`MCP Tools Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Execute a specific MCP tool
   */
  async executeTool(toolName, arguments = {}) {
    const response = await fetch(`${this.baseUrl}/mcp/tools/${toolName}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ arguments })
    });

    if (!response.ok) {
      throw new Error(`MCP Tool Execution Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check MCP server health
   */
  async checkHealth() {
    const response = await fetch(`${this.baseUrl}/mcp/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`MCP Health Check Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const mcpClient = new MCPClient(currentEnv);
export default MCPClient;
```

## 🔐 Authentication

**Important:** MCP endpoints are **publicly accessible** and do **NOT** require authentication headers.

```javascript
// ✅ Correct - No authentication needed
fetch('https://olorin-e2e.api.intuit.com/mcp/status')

// ❌ Don't add auth headers for MCP endpoints
fetch('https://olorin-e2e.api.intuit.com/mcp/status', {
  headers: {
    'Authorization': 'Bearer token' // Not needed for MCP
  }
})
```

## 📊 Available Tools

The MCP server provides these tools across all environments:

| Tool Name | Description | Example Usage |
|-----------|-------------|---------------|
| `splunk_query` | Execute Splunk queries for log analysis | Fraud detection, log investigation |
| `oii_tool` | Online identity information lookup | User verification, identity checks |
| `chronos_tool` | Time-based data analysis | Temporal pattern detection |
| `vector_search_tool` | Vector similarity search | Semantic analysis, content matching |

## 🧪 Testing Your Integration

### Basic Test

```javascript
// Test MCP connection
async function testMCPConnection() {
  try {
    const status = await mcpClient.getStatus();
    console.log('✅ MCP Status:', status);
    
    const tools = await mcpClient.getTools();
    console.log('✅ Available Tools:', tools);
    
    const health = await mcpClient.checkHealth();
    console.log('✅ Health Check:', health);
    
    return true;
  } catch (error) {
    console.error('❌ MCP Connection Failed:', error);
    return false;
  }
}

// Run the test
testMCPConnection();
```

## 🔄 Migration Checklist

- [ ] Update all MCP URLs to use main API base URLs
- [ ] Remove authentication headers from MCP requests  
- [ ] Update environment configuration
- [ ] Test MCP integration in all environments
- [ ] Update error handling for new endpoint structure
- [ ] Remove any direct port 3000 references

## 🆘 Troubleshooting

### Common Issues

1. **404 Not Found on /mcp/* endpoints**
   - Ensure you're using the correct base URL for your environment
   - Verify the MCP router is deployed with the main application

2. **CORS Issues**
   - MCP endpoints use the same CORS configuration as the main API
   - No additional CORS setup needed

3. **Connection Refused**
   - Check if the main Olorin application is running
   - Verify the MCP sidecar container is healthy

### Debug Commands

```javascript
// Debug MCP status
console.log(await mcpClient.getStatus());

// Debug available tools
console.log(await mcpClient.getTools());

// Debug health
console.log(await mcpClient.checkHealth());
```

## 📞 Support

For issues with MCP integration:

1. Check the MCP server status: `GET /mcp/status`
2. Verify tool availability: `GET /mcp/tools`
3. Test health endpoint: `GET /mcp/health`
4. Check browser network tab for request/response details
5. Contact the Olorin backend team for server-side issues

---

**Last Updated:** December 2024  
**Version:** 2.0 (Sidecar Architecture) 

## 🔄 Authentication

✅ **All MCP functionality requires authentication** - Frontend must include authentication headers  
✅ **No direct MCP access** - Frontend accesses MCP through authenticated proxy endpoints  
✅ **Standard Intuit auth** - Use existing authentication mechanisms  

## Environment Configuration

### Base URLs by Environment

```javascript
const API_BASE_URLS = {
  local: 'http://localhost:8000',
  qal: 'https://olorin-qal.api.intuit.com',
  e2e: 'https://olorin-e2e.api.intuit.com', 
  prf: 'https://olorin-prf.api.intuit.com',
  stg: 'https://olorin-stg.api.intuit.com',
  prd: 'https://olorin-prd.api.intuit.com'
};

// Auto-detect environment
function getApiBaseUrl() {
  const hostname = window.location.hostname;
  if (hostname.includes('localhost')) return API_BASE_URLS.local;
  if (hostname.includes('qal')) return API_BASE_URLS.qal;
  if (hostname.includes('e2e')) return API_BASE_URLS.e2e;
  if (hostname.includes('prf')) return API_BASE_URLS.prf;
  if (hostname.includes('stg')) return API_BASE_URLS.stg;
  return API_BASE_URLS.prd;
}
```

## MCP Proxy Endpoints

### Available Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/settings` | GET | Get configuration and proxy endpoint URLs | Required |
| `/api/mcp-proxy/health` | GET | MCP server health check | Required |
| `/api/mcp-proxy/status` | GET | MCP server status and capabilities | Required |
| `/api/mcp-proxy/tools` | GET | List available MCP tools | Required |
| `/api/mcp-proxy/prompts` | GET | List available MCP prompts | Required |
| `/api/mcp-proxy/tools/{tool}/execute` | POST | Execute MCP tool | Required |
| `/api/mcp-proxy/prompts/custom` | POST | Execute custom prompt | Required |

### Settings Endpoint Response

```javascript
// GET /api/settings
{
  "mcp_server": {
    "host": "localhost",
    "port": 3000,
    "base_url": "http://localhost:3000",
    "proxy_endpoints": {
      "health": "/api/mcp-proxy/health",
      "tools": "/api/mcp-proxy/tools",
      "prompts": "/api/mcp-proxy/prompts",
      "status": "/api/mcp-proxy/status",
      "tool_execute": "/api/mcp-proxy/tools/{tool_name}/execute",
      "custom_prompt": "/api/mcp-proxy/prompts/custom"
    }
  },
  "environment": {
    "log_level": "DEBUG",
    "asset_id": "3825825476777495228",
    "app_id": "Intuit.cas.hri.olorin"
  },
  "features": {
    "enabled_tools": ["OIITool", "TavilySearchTool"],
    "use_ips_cache": false,
    "enable_langfuse": true
  },
  "integration": {
    "type": "authenticated_proxy",
    "description": "MCP functionality accessed through authenticated proxy endpoints",
    "authentication_required": true
  }
}
```

## JavaScript MCP Client

### Complete MCP Client Class

```javascript
class MCPClient {
  constructor(baseUrl, authHeaders = {}) {
    this.baseUrl = baseUrl;
    this.authHeaders = authHeaders;
    this.settings = null;
  }

  // Load settings and proxy endpoint URLs
  async loadSettings() {
    try {
      const response = await fetch(`${this.baseUrl}/api/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders
        }
      });

      if (!response.ok) {
        throw new Error(`Settings request failed: ${response.status} ${response.statusText}`);
      }

      this.settings = await response.json();
      return this.settings;
    } catch (error) {
      console.error('Failed to load MCP settings:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    await this.ensureSettingsLoaded();
    
    try {
      const response = await fetch(`${this.baseUrl}${this.settings.mcp_server.proxy_endpoints.health}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders
        }
      });

      if (!response.ok) {
        throw new Error(`Health check failed: HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('MCP health check failed:', error);
      throw error;
    }
  }

  // Get server status
  async getStatus() {
    await this.ensureSettingsLoaded();
    
    try {
      const response = await fetch(`${this.baseUrl}${this.settings.mcp_server.proxy_endpoints.status}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders
        }
      });

      if (!response.ok) {
        throw new Error(`Status request failed: HTTP ${response.status}`);
      }

      const statusText = await response.json();
      return JSON.parse(statusText); // MCP server returns JSON as string
    } catch (error) {
      console.error('Failed to get MCP status:', error);
      throw error;
    }
  }

  // List available tools
  async listTools() {
    await this.ensureSettingsLoaded();
    
    try {
      const response = await fetch(`${this.baseUrl}${this.settings.mcp_server.proxy_endpoints.tools}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders
        }
      });

      if (!response.ok) {
        throw new Error(`Tools request failed: HTTP ${response.status}`);
      }

      const toolsText = await response.json();
      return JSON.parse(toolsText); // MCP server returns JSON as string
    } catch (error) {
      console.error('Failed to list MCP tools:', error);
      throw error;
    }
  }

  // List available prompts
  async listPrompts() {
    await this.ensureSettingsLoaded();
    
    try {
      const response = await fetch(`${this.baseUrl}${this.settings.mcp_server.proxy_endpoints.prompts}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders
        }
      });

      if (!response.ok) {
        throw new Error(`Prompts request failed: HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to list MCP prompts:', error);
      throw error;
    }
  }

  // Execute a tool
  async executeTool(toolName, arguments_) {
    await this.ensureSettingsLoaded();
    
    try {
      const endpoint = this.settings.mcp_server.proxy_endpoints.tool_execute.replace('{tool_name}', toolName);
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders
        },
        body: JSON.stringify({
          arguments: arguments_
        })
      });

      if (!response.ok) {
        throw new Error(`Tool execution failed: HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to execute tool ${toolName}:`, error);
      throw error;
    }
  }

  // Execute custom prompt
  async executeCustomPrompt(prompt, context = {}) {
    await this.ensureSettingsLoaded();
    
    try {
      const response = await fetch(`${this.baseUrl}${this.settings.mcp_server.proxy_endpoints.custom_prompt}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders
        },
        body: JSON.stringify({
          prompt: prompt,
          context: context
        })
      });

      if (!response.ok) {
        throw new Error(`Custom prompt execution failed: HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to execute custom prompt:', error);
      throw error;
    }
  }

  // Helper method to ensure settings are loaded
  async ensureSettingsLoaded() {
    if (!this.settings) {
      await this.loadSettings();
    }
  }
}
```

## Usage Examples

### Initialize MCP Client

```javascript
// Auto-detect environment and initialize
const apiBaseUrl = getApiBaseUrl();
const authHeaders = {
  'Authorization': 'Bearer your-auth-token',
  // Add other required auth headers
};

const mcpClient = new MCPClient(apiBaseUrl, authHeaders);
```

### Basic Health Check

```javascript
async function checkMCPHealth() {
  try {
    const health = await mcpClient.healthCheck();
    console.log('MCP Health:', health);
    return health.status === 'healthy';
  } catch (error) {
    console.error('MCP health check failed:', error);
    return false;
  }
}
```

### List Available Tools

```javascript
async function loadAvailableTools() {
  try {
    const tools = await mcpClient.listTools();
    console.log('Available tools:', tools);
    
    // Extract Olorin tools
    const olorinTools = tools.olorin_tools || {};
    const toolNames = Object.keys(olorinTools);
    
    return toolNames;
  } catch (error) {
    console.error('Failed to load tools:', error);
    return [];
  }
}
```

### Execute Splunk Query

```javascript
async function executeSplunkQuery(query, timeRange = '24h') {
  try {
    const result = await mcpClient.executeTool('splunk_query', {
      query: query,
      time_range: timeRange,
      max_results: 100
    });
    
    console.log('Splunk query result:', result);
    return result;
  } catch (error) {
    console.error('Splunk query failed:', error);
    throw error;
  }
}
```

### Execute OII Lookup

```javascript
async function lookupUserIdentity(userId) {
  try {
    const result = await mcpClient.executeTool('oii_tool', {
      user_id: userId
    });
    
    console.log('OII lookup result:', result);
    return result;
  } catch (error) {
    console.error('OII lookup failed:', error);
    throw error;
  }
}
```

### Execute Custom Prompt

```javascript
async function analyzeUserBehavior(userData) {
  try {
    const result = await mcpClient.executeCustomPrompt(
      'Analyze the following user data for potential fraud indicators: {{user_data}}',
      { user_data: userData }
    );
    
    console.log('Analysis result:', result);
    return result;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}
```

## Error Handling

### HTTP Status Codes

| Code | Description | Action |
|------|-------------|--------|
| 200 | Success | Process response |
| 401 | Unauthorized | Refresh authentication |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Check endpoint URL |
| 503 | Service Unavailable | MCP server down |
| 504 | Gateway Timeout | Retry request |

### Error Handling Pattern

```javascript
async function handleMCPRequest(requestFunc) {
  try {
    return await requestFunc();
  } catch (error) {
    if (error.message.includes('401')) {
      // Handle authentication error
      await refreshAuthentication();
      return await requestFunc(); // Retry
    } else if (error.message.includes('503')) {
      // MCP server unavailable
      console.warn('MCP server temporarily unavailable');
      return null;
    } else {
      // Other errors
      console.error('MCP request failed:', error);
      throw error;
    }
  }
}
```

## React Hook Example

```javascript
import { useState, useEffect, useCallback } from 'react';

export function useMCPClient() {
  const [mcpClient, setMCPClient] = useState(null);
  const [isHealthy, setIsHealthy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initializeMCP() {
      try {
        setLoading(true);
        const apiBaseUrl = getApiBaseUrl();
        const authHeaders = {
          'Authorization': `Bearer ${getAuthToken()}`,
        };
        
        const client = new MCPClient(apiBaseUrl, authHeaders);
        await client.loadSettings();
        
        const health = await client.healthCheck();
        setIsHealthy(health.status === 'healthy');
        setMCPClient(client);
        setError(null);
      } catch (err) {
        setError(err.message);
        setIsHealthy(false);
      } finally {
        setLoading(false);
      }
    }

    initializeMCP();
  }, []);

  const executeTool = useCallback(async (toolName, args) => {
    if (!mcpClient) throw new Error('MCP client not initialized');
    return await mcpClient.executeTool(toolName, args);
  }, [mcpClient]);

  return {
    mcpClient,
    isHealthy,
    loading,
    error,
    executeTool
  };
}
```

## Testing

### Local Testing

```bash
# Test settings endpoint
curl -H "Authorization: Bearer test-token" http://localhost:8000/api/settings

# Test health endpoint  
curl -H "Authorization: Bearer test-token" http://localhost:8000/api/mcp-proxy/health

# Test tools endpoint
curl -H "Authorization: Bearer test-token" http://localhost:8000/api/mcp-proxy/tools
```

### E2E Testing

```bash
# Test settings endpoint
curl -H "Authorization: Bearer your-token" https://olorin-e2e.api.intuit.com/api/settings

# Test health endpoint
curl -H "Authorization: Bearer your-token" https://olorin-e2e.api.intuit.com/api/mcp-proxy/health
```

## Migration Checklist

- [ ] Update frontend to use proxy endpoints instead of direct MCP URLs
- [ ] Ensure authentication headers are included in all MCP requests  
- [ ] Update environment configuration to use new endpoint structure
- [ ] Test all MCP functionality through proxy endpoints
- [ ] Update error handling for proxy-specific error codes
- [ ] Remove any direct MCP server connection code

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check authentication headers and token validity
2. **503 Service Unavailable**: MCP server sidecar not running
3. **504 Gateway Timeout**: MCP server overloaded or slow response
4. **JSON Parse Errors**: Some MCP responses are JSON strings that need parsing

### Debug Steps

1. Check if settings endpoint works: `GET /api/settings`
2. Verify authentication headers are correct
3. Test health endpoint: `GET /api/mcp-proxy/health`
4. Check browser network tab for detailed error responses
5. Verify MCP server is running in backend logs

## Support

For issues with MCP integration:
1. Check this documentation first
2. Test endpoints manually with curl
3. Check browser console for JavaScript errors
4. Contact backend team if proxy endpoints are failing 