# MCP (Model Context Protocol) Endpoints Guide

**Date**: 2025-01-27  
**Version**: 2.1.0  
**Purpose**: Complete reference for MCP server endpoints across all environments

---

## 📋 **OVERVIEW**

The OLORIN system provides MCP (Model Context Protocol) server functionality for seamless integration with AI tools and applications. This guide lists all endpoints users need to connect to for each environment.

---

## 🌍 **ENVIRONMENT-SPECIFIC ENDPOINTS**

### **🏠 Local Development Environment**
**Base URL**: `http://localhost:3000`

#### **Core MCP Endpoints**
| Endpoint | Method | Description | Usage |
|----------|--------|-------------|-------|
| `/health` | GET | Health check and server status | Monitor server availability |
| `/resources/olorin://status` | GET | Detailed server status with tool counts | Verify tool initialization |
| `/resources/olorin://tools` | GET | List all available tools and capabilities | Discover available tools |

#### **Tool Execution Endpoints**
| Endpoint | Method | Description | Request Body |
|----------|--------|-------------|--------------|
| `/tools/call` | POST | Execute any available tool | `{"name": "tool_name", "arguments": {...}}` |

#### **Prompt Management Endpoints**
| Endpoint | Method | Description | Request Body |
|----------|--------|-------------|--------------|
| `/prompts` | GET | List all available prompts | None |
| `/prompts/get` | POST | Execute a specific prompt | `{"name": "prompt_name", "arguments": {...}}` |
| `/prompts/custom` | POST | Execute custom prompt text | `{"prompt_text": "...", "context": {...}}` |
| `/prompts/examples` | GET | Get example prompts for reference | None |

#### **Template Management Endpoints**
| Endpoint | Method | Description | Request Body |
|----------|--------|-------------|--------------|
| `/prompts/templates` | GET | List all prompt templates | None |
| `/prompts/templates/create` | POST | Create new prompt template | `{"name": "...", "template": "...", "description": "..."}` |
| `/prompts/templates/{name}/execute` | POST | Execute prompt template | Template-specific arguments |
| `/prompts/templates/{name}` | DELETE | Delete prompt template | None |

#### **Connection Examples**
```bash
# Health check
curl http://localhost:3000/health

# List available tools
curl http://localhost:3000/resources/olorin://tools

# Execute a tool
curl -X POST http://localhost:3000/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "splunk_query_tool", "arguments": {"query": "search index=main"}}'

# Execute custom prompt
curl -X POST http://localhost:3000/prompts/custom \
  -H "Content-Type: application/json" \
  -d '{"prompt_text": "Analyze this data for patterns", "context": {"data": "sample"}}'
```

---

### **🧪 QAL Environment**
**Base URL**: `https://olorin-qal.api.intuit.com:3000`

#### **Core MCP Endpoints**
| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/health` | GET | Health check and server status | Required |
| `/resources/olorin://status` | GET | Detailed server status | Required |
| `/resources/olorin://tools` | GET | List all available tools | Required |
| `/tools/call` | POST | Execute any available tool | Required |
| `/prompts/*` | GET/POST | All prompt endpoints | Required |
| `/prompts/templates/*` | GET/POST/DELETE | Template management | Required |

#### **Connection Examples**
```bash
# Health check with authentication
curl https://olorin-qal.api.intuit.com:3000/health \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "intuit_experience_id: YOUR_EXPERIENCE_ID"

# Execute tool in QAL
curl -X POST https://olorin-qal.api.intuit.com:3000/tools/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "splunk_query_tool", "arguments": {"query": "search index=rss-e2eidx"}}'
```

---

### **🔬 E2E Environment**
**Base URL**: `https://olorin-e2e.api.intuit.com:3000`

#### **Core MCP Endpoints**
| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/health` | GET | Health check and server status | Required |
| `/resources/olorin://status` | GET | Detailed server status | Required |
| `/resources/olorin://tools` | GET | List all available tools | Required |
| `/tools/call` | POST | Execute any available tool | Required |
| `/prompts/*` | GET/POST | All prompt endpoints | Required |
| `/prompts/templates/*` | GET/POST/DELETE | Template management | Required |

#### **Connection Examples**
```bash
# Health check
curl https://olorin-e2e.api.intuit.com:3000/health \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "intuit_experience_id: d3d28eaa-7ca9-4aa2-8905-69ac11fd8c58"

# List tools
curl https://olorin-e2e.api.intuit.com:3000/resources/olorin://tools \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### **🧪 PRF Environment**
**Base URL**: `https://olorin-prf.api.intuit.com:3000`

#### **Core MCP Endpoints**
| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/health` | GET | Health check and server status | Required |
| `/resources/olorin://status` | GET | Detailed server status | Required |
| `/resources/olorin://tools` | GET | List all available tools | Required |
| `/tools/call` | POST | Execute any available tool | Required |
| `/prompts/*` | GET/POST | All prompt endpoints | Required |
| `/prompts/templates/*` | GET/POST/DELETE | Template management | Required |

---

### **🎭 STG Environment**
**Base URL**: `https://olorin-stg.api.intuit.com:3000`

#### **Core MCP Endpoints**
| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/health` | GET | Health check and server status | Required |
| `/resources/olorin://status` | GET | Detailed server status | Required |
| `/resources/olorin://tools` | GET | List all available tools | Required |
| `/tools/call` | POST | Execute any available tool | Required |
| `/prompts/*` | GET/POST | All prompt endpoints | Required |
| `/prompts/templates/*` | GET/POST/DELETE | Template management | Required |

---

### **🚀 PRD Environment**
**Base URL**: `https://olorin.api.intuit.com:3000`

#### **Core MCP Endpoints**
| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/health` | GET | Health check and server status | Required |
| `/resources/olorin://status` | GET | Detailed server status | Required |
| `/resources/olorin://tools` | GET | List all available tools | Required |
| `/tools/call` | POST | Execute any available tool | Required |
| `/prompts/*` | GET/POST | All prompt endpoints | Required |
| `/prompts/templates/*` | GET/POST/DELETE | Template management | Required |

#### **Production Connection Examples**
```bash
# Health check in production
curl https://olorin.api.intuit.com:3000/health \
  -H "Authorization: Bearer YOUR_PRODUCTION_TOKEN" \
  -H "intuit_experience_id: YOUR_PRODUCTION_EXPERIENCE_ID"

# Execute tool in production
curl -X POST https://olorin.api.intuit.com:3000/tools/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PRODUCTION_TOKEN" \
  -d '{"name": "identity_info_tool", "arguments": {"profile_id": "USER_ID"}}'
```

---

## 🛠️ **AVAILABLE TOOLS**

### **OLORIN-Specific Tools**
| Tool Name | Description | Environment Availability |
|-----------|-------------|-------------------------|
| `splunk_query_tool` | Execute Splunk queries for security analysis | All environments |
| `identity_info_tool` | Retrieve user identity information | All environments |
| `chronos_tool` | Device and session analysis | All environments |
| `vector_search_tool` | Semantic search capabilities | All environments |
| `customer_tools` | Customer data analysis | All environments |
| `retriever_tool` | Document and data retrieval | All environments |
| `cdc_tool` | Customer data platform integration | All environments |

### **LangChain Tools**
| Tool Name | Description | Environment Availability |
|-----------|-------------|-------------------------|
| `tavily_search` | Advanced web search with AI insights | All environments |
| `duckduckgo_search` | General web search | All environments |
| `arxiv_search` | Academic paper search | All environments |
| `python_repl` | Execute Python code | All environments |
| `file_management` | File operations and management | All environments |

---

## 🔐 **AUTHENTICATION REQUIREMENTS**

### **Local Development**
- **Authentication**: None required
- **Headers**: Optional
- **Rate Limiting**: None

### **Pre-Production Environments (QAL, E2E, PRF)**
- **Authentication**: Bearer token required
- **Required Headers**:
  - `Authorization: Bearer {token}`
  - `intuit_experience_id: {experience_id}`
  - `intuit_originating_assetalias: Intuit.cas.hri.olorin`
- **Rate Limiting**: Applied
- **Token Source**: Identity service authentication

### **Production Environments (STG, PRD)**
- **Authentication**: Production Bearer token required
- **Required Headers**:
  - `Authorization: Bearer {production_token}`
  - `intuit_experience_id: {production_experience_id}`
  - `intuit_originating_assetalias: Intuit.cas.hri.olorin`
- **Rate Limiting**: Strict limits applied
- **Token Source**: Production identity service

---

## 📊 **PROMPT TEMPLATES**

### **Built-in Prompts**
| Prompt Name | Description | Usage |
|-------------|-------------|-------|
| `data_analysis_prompt` | Comprehensive data analysis framework | `{"data_context": "description"}` |
| `comprehensive_research_prompt` | Research methodology and execution | `{"research_topic": "topic"}` |
| `risk_assessment_prompt` | Risk analysis framework | `{"risk_context": "context"}` |
| `customer_analysis_prompt` | Customer behavior analysis | `{"customer_context": "context"}` |
| `investigation_prompt` | Investigation workflow guidance | `{"investigation_type": "type"}` |

### **Custom Prompt Execution**
```json
{
  "prompt_text": "Your custom prompt here",
  "context": {
    "data": "relevant context",
    "parameters": "additional info"
  },
  "max_tokens": 2000,
  "temperature": 0.7
}
```

---

## 🔄 **CLIENT INTEGRATION EXAMPLES**

### **Python Client**
```python
import requests
import json

class OlorinMCPClient:
    def __init__(self, base_url, auth_token=None):
        self.base_url = base_url
        self.headers = {"Content-Type": "application/json"}
        if auth_token:
            self.headers["Authorization"] = f"Bearer {auth_token}"
    
    def call_tool(self, tool_name, arguments):
        response = requests.post(
            f"{self.base_url}/tools/call",
            headers=self.headers,
            json={"name": tool_name, "arguments": arguments}
        )
        return response.json()
    
    def execute_custom_prompt(self, prompt_text, context=None):
        response = requests.post(
            f"{self.base_url}/prompts/custom",
            headers=self.headers,
            json={
                "prompt_text": prompt_text,
                "context": context or {}
            }
        )
        return response.json()

# Usage examples
# Local development
client = OlorinMCPClient("http://localhost:3000")

# Production
client = OlorinMCPClient(
    "https://olorin.api.intuit.com:3000",
    auth_token="your_production_token"
)

# Execute tool
result = client.call_tool("splunk_query_tool", {
    "query": "search index=main | head 10"
})

# Execute custom prompt
result = client.execute_custom_prompt(
    "Analyze this user behavior for anomalies",
    {"user_id": "12345", "timeframe": "24h"}
)
```

### **JavaScript/TypeScript Client**
```typescript
class OlorinMCPClient {
    constructor(
        private baseUrl: string,
        private authToken?: string
    ) {}

    private async makeRequest(endpoint: string, method: string = 'GET', body?: any) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        return response.json();
    }

    async callTool(toolName: string, arguments: Record<string, any>) {
        return this.makeRequest('/tools/call', 'POST', {
            name: toolName,
            arguments
        });
    }

    async executeCustomPrompt(promptText: string, context?: Record<string, any>) {
        return this.makeRequest('/prompts/custom', 'POST', {
            prompt_text: promptText,
            context: context || {}
        });
    }

    async getAvailableTools() {
        return this.makeRequest('/resources/olorin://tools');
    }
}

// Usage
const client = new OlorinMCPClient(
    'https://olorin.api.intuit.com:3000',
    'your_token_here'
);

// Execute tool
const result = await client.callTool('identity_info_tool', {
    profile_id: '12345'
});
```

---

## 🔍 **TROUBLESHOOTING**

### **Common Connection Issues**
1. **Connection Refused**: Check if MCP server is running on the specified port
2. **Authentication Failed**: Verify bearer token and required headers
3. **Tool Not Found**: Check available tools using `/resources/olorin://tools`
4. **Rate Limiting**: Implement retry logic with exponential backoff

### **Environment-Specific Issues**
- **Local**: Ensure server is started with `python app/mcp/comprehensive_mcp_server.py`
- **Pre-prod**: Verify VPN connection and authentication tokens
- **Production**: Ensure production credentials and proper authorization

### **Debug Commands**
```bash
# Test connectivity
curl -I {base_url}/health

# Check available tools
curl {base_url}/resources/olorin://tools

# Verify authentication
curl -H "Authorization: Bearer {token}" {base_url}/resources/olorin://status
```

---

## 📚 **ADDITIONAL RESOURCES**

- **MCP Configuration**: `app/mcp/mcp_config.json`
- **Environment Settings**: `app/service/config.py`
- **Client Examples**: `app/mcp/mcp_client_example.py`
- **Integration Tests**: `fullflows/test_mcp_comprehensive.py`

---

## 🆘 **SUPPORT**

For technical support or questions:
1. Check server logs for error details
2. Verify authentication and network connectivity
3. Test with health endpoint first
4. Review environment-specific configuration
5. Contact the OLORIN team for production issues 