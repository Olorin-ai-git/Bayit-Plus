# WebSocket Issues Summary - June 2025

## 🚨 CRITICAL ISSUE
**Problem:** Frontend trying to connect to `wss://olorin-e2e.api.olorin.com/mcp/ws`
**Result:** 404 Not Found
**Root Cause:** This WebSocket endpoint does not exist

## ❌ INCORRECT URLs
```
wss://olorin-e2e.api.olorin.com/mcp/ws                    ← Does not exist
wss://olorin-e2e.api.olorin.com/mcp/websocket            ← Does not exist  
wss://olorin-e2e.api.olorin.com/mcp/api/mcp-proxy/health ← This is HTTP, not WebSocket
```

## ✅ CORRECT URLs

### MCP Communication (HTTP REST):
```
# Production
https://api.olorin.ai/api/mcp-proxy/health
https://api.olorin.ai/api/mcp-proxy/tools
https://api.olorin.ai/api/mcp-proxy/status

# Local Development
http://localhost:8090/api/mcp-proxy/health
http://localhost:8090/api/mcp-proxy/tools
http://localhost:8090/api/mcp-proxy/status
```

### Investigation WebSockets:
```
# Production
wss://api.olorin.ai/ws/{investigation_id}?user_id={user}&role={role}
wss://api.olorin.ai/ws/enhanced/{investigation_id}?user_id={user}&role={role}
wss://api.olorin.ai/ws/test

# Local Development
ws://localhost:8090/ws/{investigation_id}?user_id={user}&role={role}
ws://localhost:8090/ws/enhanced/{investigation_id}?user_id={user}&role={role}
ws://localhost:8090/ws/test
```

### Admin WebSockets:
```
# Production
wss://api.olorin.ai/api/admin/logs/stream/{client_id}

# Local Development
ws://localhost:8090/api/admin/logs/stream/{client_id}
```

## 🔧 IMMEDIATE FIX
Change frontend configuration from:
```javascript
❌ wsUrl: 'wss://olorin-e2e.api.olorin.com/mcp/ws'
```
To:
```javascript
// Production
✅ wsUrl: `wss://api.olorin.ai/ws/${investigationId}?user_id=${userId}&role=${role}`

// Local Development  
✅ wsUrl: `ws://localhost:8090/ws/${investigationId}?user_id=${userId}&role=${role}`
```

## 📋 KEY POINTS
1. **MCP uses HTTP REST** - no WebSocket support
2. **WebSocket is for real-time investigation updates** - not MCP
3. **These are separate systems** with different purposes
4. **Existing WebSocket guide:** `docs/WEBSOCKET_CONFIGURATION_GUIDE.md`

## 🛠 VERIFICATION
Test correct WebSocket:
```bash
# Production
wscat -c "wss://api.olorin.ai/ws/test"

# Local Development
wscat -c "ws://localhost:8090/ws/test"
```

Test correct MCP endpoint:
```bash
# Production
curl "https://api.olorin.ai/api/mcp-proxy/health"

# Local Development
curl "http://localhost:8090/api/mcp-proxy/health"
```
