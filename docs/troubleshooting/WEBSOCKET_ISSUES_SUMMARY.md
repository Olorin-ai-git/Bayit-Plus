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
https://olorin-e2e.api.olorin.com/api/mcp-proxy/health
https://olorin-e2e.api.olorin.com/api/mcp-proxy/tools
https://olorin-e2e.api.olorin.com/api/mcp-proxy/status
```

### Investigation WebSockets:
```
wss://olorin-e2e.api.olorin.com/ws/{investigation_id}?user_id={user}&role={role}
wss://olorin-e2e.api.olorin.com/ws/enhanced/{investigation_id}?user_id={user}&role={role}
wss://olorin-e2e.api.olorin.com/ws/test
```

### Admin WebSockets:
```
wss://olorin-e2e.api.olorin.com/api/admin/logs/stream/{client_id}
```

## 🔧 IMMEDIATE FIX
Change frontend configuration from:
```javascript
❌ wsUrl: 'wss://olorin-e2e.api.olorin.com/mcp/ws'
```
To:
```javascript
✅ wsUrl: `wss://olorin-e2e.api.olorin.com/ws/${investigationId}?user_id=${userId}&role=${role}`
```

## 📋 KEY POINTS
1. **MCP uses HTTP REST** - no WebSocket support
2. **WebSocket is for real-time investigation updates** - not MCP
3. **These are separate systems** with different purposes
4. **Existing WebSocket guide:** `docs/WEBSOCKET_CONFIGURATION_GUIDE.md`

## 🛠 VERIFICATION
Test correct WebSocket:
```bash
wscat -c "wss://olorin-e2e.api.olorin.com/ws/test"
```

Test correct MCP endpoint:
```bash
curl "https://olorin-e2e.api.olorin.com/api/mcp-proxy/health"
```
