# WebSocket Configuration Issues - June 2025

## 🚨 **CRITICAL ISSUE IDENTIFIED**

### **Problem Statement**
Frontend application attempting to connect to invalid WebSocket URL:
```
❌ wss://olorin-e2e.api.intuit.com/mcp/ws
```

**Result:** `404 Not Found` error

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **1. Invalid URL Pattern**
- **Attempted URL:** `wss://olorin-e2e.api.intuit.com/mcp/ws`
- **Issue:** No WebSocket endpoint exists at `/mcp/ws`
- **Verification:** OpenAPI spec shows no WebSocket routes under `/mcp/*`

### **2. Protocol Confusion**
**MCP (Model Context Protocol) vs WebSocket Confusion:**

| **MCP Communication** | **WebSocket Communication** |
|----------------------|------------------------------|
| ✅ HTTP REST endpoints | ✅ WebSocket endpoints |
| ✅ `/api/mcp-proxy/*` paths | ✅ `/ws/*` paths |
| ✅ Stateless request/response | ✅ Stateful real-time connection |
| ✅ Tool execution & prompts | ✅ Investigation updates |

### **3. Architecture Misunderstanding**
- **MCP Server:** Runs on `localhost:3000` (HTTP only)
- **WebSocket Server:** Integrated into main FastAPI app on port 8000
- **These are separate services with different purposes**

---

## ✅ **CORRECT CONFIGURATIONS**

### **For MCP Communication (HTTP):**
```javascript
// Correct MCP endpoint usage
const mcpHealth = await fetch('https://olorin-e2e.api.intuit.com/api/mcp-proxy/health');
const mcpTools = await fetch('https://olorin-e2e.api.intuit.com/api/mcp-proxy/tools');
const mcpStatus = await fetch('https://olorin-e2e.api.intuit.com/api/mcp-proxy/status');
```

### **For Real-time Investigation Updates (WebSocket):**
```javascript
// Correct WebSocket endpoint usage
const wsUrl = `wss://olorin-e2e.api.intuit.com/ws/${investigationId}?user_id=${userId}&role=${role}`;
const ws = new WebSocket(wsUrl);
```

---

## 🔧 **IMMEDIATE FIXES REQUIRED**

### **1. Frontend Code Update**
**Change this:**
```javascript
❌ wsUrl: 'wss://olorin-e2e.api.intuit.com/mcp/ws'
```

**To this:**
```javascript
✅ wsUrl: `wss://olorin-e2e.api.intuit.com/ws/${investigationId}?user_id=${userId}&role=${role}`
```

### **2. Configuration Validation**
Add validation to prevent invalid WebSocket URLs:
```javascript
function validateWebSocketUrl(url) {
    const validPatterns = [
        /^wss:\/\/.*\/ws\/[^\/]+$/,           // Investigation WebSocket
        /^wss:\/\/.*\/ws\/enhanced\/[^\/]+$/, // Enhanced WebSocket  
        /^wss:\/\/.*\/ws\/test$/,             // Test WebSocket
        /^wss:\/\/.*\/api\/admin\/logs\/stream\/[^\/]+$/ // Admin logs
    ];
    
    return validPatterns.some(pattern => pattern.test(url));
}
```

### **3. Error Handling Enhancement**
```javascript
ws.onerror = (error) => {
    console.error('❌ WebSocket Error:', error);
    if (wsUrl.includes('/mcp/')) {
        console.error('🚨 CONFIGURATION ERROR: MCP endpoints do not support WebSocket!');
        console.error('💡 Use HTTP endpoints for MCP: /api/mcp-proxy/*');
        console.error('💡 Use WebSocket endpoints for investigations: /ws/*');
    }
};
```

---

## 📊 **AVAILABLE WEBSOCKET ENDPOINTS**

Based on server logs and routing analysis:

### **✅ Working WebSocket Endpoints:**
```
/ws/test                           - Basic connectivity test
/ws/{investigation_id}             - Investigation updates  
/ws/enhanced/{investigation_id}    - Enhanced investigation updates
/api/admin/logs/stream/{client_id} - Admin log streaming
```

### **❌ Non-existent WebSocket Endpoints:**
```
/mcp/ws                           - Does not exist
/mcp/websocket                    - Does not exist  
/websocket                        - Does not exist
/socket                           - Does not exist
```

---

## 🛠 **TESTING AND VERIFICATION**

### **Test WebSocket Connectivity:**
```bash
# Test basic WebSocket
wscat -c "wss://olorin-e2e.api.intuit.com/ws/test"

# Test investigation WebSocket
wscat -c "wss://olorin-e2e.api.intuit.com/ws/TEST_INV?user_id=test&role=observer"
```

### **Test MCP HTTP Endpoints:**
```bash
# Test MCP proxy endpoints
curl -s "https://olorin-e2e.api.intuit.com/api/mcp-proxy/health"
curl -s "https://olorin-e2e.api.intuit.com/api/mcp-proxy/tools"
curl -s "https://olorin-e2e.api.intuit.com/api/mcp-proxy/status"
```

### **Verify OpenAPI Specification:**
```bash
# Check available endpoints
curl -s "https://olorin-e2e.api.intuit.com/openapi.json" | jq '.paths | keys | map(select(contains("ws") or contains("mcp")))'
```

---

## 📋 **ACTION ITEMS**

### **High Priority:**
1. ✅ Update frontend WebSocket URL configuration
2. ✅ Remove any references to `/mcp/ws` endpoints
3. ✅ Add URL validation for WebSocket connections
4. ✅ Update documentation to clarify MCP vs WebSocket usage

### **Medium Priority:**
1. 🔄 Add better error messages for invalid WebSocket URLs
2. 🔄 Implement connection retry logic with exponential backoff
3. 🔄 Add monitoring for WebSocket connection failures

### **Low Priority:**
1. 📝 Create frontend configuration guide
2. 📝 Add automated tests for WebSocket connectivity
3. 📝 Document all available WebSocket message types

---

## 📞 **SUPPORT INFORMATION**

**For WebSocket Issues:**
- Check URL patterns against this document
- Verify authentication tokens
- Test with `/ws/test` endpoint first
- Check browser developer tools for detailed errors

**For MCP Issues:**
- Use HTTP REST endpoints only
- Check `/api/mcp-proxy/*` endpoints
- Verify MCP server is running on localhost:3000
- Test with curl/Postman first

**Remember:** 
- **MCP = HTTP REST** (no WebSocket)
- **Investigation Updates = WebSocket** (no HTTP polling)
- **These are different systems for different purposes**

---

## 📅 **Document History**

- **June 25, 2025:** Initial issue identification and documentation
- **Status:** Active issue requiring frontend configuration update
- **Next Review:** After frontend fix implementation 