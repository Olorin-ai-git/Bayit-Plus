# OLORIN WebSocket Configuration Guide

## 🚨 Critical WebSocket URL Issues Identified

### **❌ INCORRECT URL PATTERNS**

The following WebSocket URL patterns are **INVALID** and will result in 404 errors:

```
❌ wss://olorin-e2e.api.olorin.com/mcp/ws
❌ ws://localhost:3000/ws
❌ wss://olorin-e2e.api.olorin.com/mcp/websocket
```

**Why these don't work:**
1. **No MCP WebSocket Endpoint**: The MCP server (port 3000) operates via HTTP REST API only, not WebSocket
2. **Incorrect Path Structure**: `/mcp/ws` path doesn't exist in the routing configuration
3. **Wrong Protocol**: MCP communication uses HTTP requests, not WebSocket connections

---

## ✅ **CORRECT WEBSOCKET ENDPOINTS**

### **1. Investigation WebSocket Endpoints**

#### **Basic Investigation WebSocket:**
```
# Production
wss://api.olorin.ai/ws/{investigation_id}

# Local Development  
ws://localhost:8090/ws/{investigation_id}
```

**Parameters (Query String):**
- `user_id`: Required - User identifier
- `role`: Optional - User role (`owner`, `investigator`, `observer`) - defaults to `observer`
- `parallel`: Optional - Enable parallel agent execution (`true`/`false`) - defaults to `false`

**Example:**
```javascript
// Production
const wsUrl = `wss://api.olorin.ai/ws/INVESTIGATION_123?user_id=user123&role=investigator&parallel=true`;

// Local Development
const wsUrl = `ws://localhost:8090/ws/INVESTIGATION_123?user_id=user123&role=investigator&parallel=true`;
```

#### **Enhanced Investigation WebSocket:**
```
# Production
wss://api.olorin.ai/ws/enhanced/{investigation_id}

# Local Development
ws://localhost:8090/ws/enhanced/{investigation_id}
```

**Parameters (Query String):**
- `user_id`: **Required** - User identifier
- `role`: Optional - User role - defaults to `observer`
- `parallel`: Optional - Enable parallel execution - defaults to `false`

**Example:**
```javascript
// Production
const wsUrl = `wss://api.olorin.ai/ws/enhanced/INVESTIGATION_123?user_id=user123&role=owner&parallel=false`;

// Local Development
const wsUrl = `ws://localhost:8090/ws/enhanced/INVESTIGATION_123?user_id=user123&role=owner&parallel=false`;
```

### **2. Admin Log Streaming WebSocket**

```
# Production
wss://api.olorin.ai/api/admin/logs/stream/{client_id}

# Local Development
ws://localhost:8090/api/admin/logs/stream/{client_id}
```

**Authentication Required:** Admin-level access with proper authorization headers

**Example:**
```javascript
// Production
const wsUrl = `wss://api.olorin.ai/api/admin/logs/stream/admin_client_123`;

// Local Development
const wsUrl = `ws://localhost:8090/api/admin/logs/stream/admin_client_123`;
```

### **3. Test WebSocket**

```
# Production
wss://api.olorin.ai/ws/test

# Local Development
ws://localhost:8090/ws/test
```

**Purpose:** Basic connectivity testing - connects and immediately closes

---

## 🔧 **IMPLEMENTATION EXAMPLES**

### **JavaScript WebSocket Connection**

```javascript
// Investigation WebSocket with proper error handling
class OlorinWebSocketClient {
    constructor(investigationId, userId, role = 'observer', parallel = false) {
        this.investigationId = investigationId;
        this.userId = userId;
        this.role = role;
        this.parallel = parallel;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect() {
        // Use appropriate URL based on environment
        const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'wss://api.olorin.ai' 
            : 'ws://localhost:8090';
        const wsUrl = `${baseUrl}/ws/${this.investigationId}?user_id=${this.userId}&role=${this.role}&parallel=${this.parallel}`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = (event) => {
                console.log('✅ WebSocket connected successfully');
                this.reconnectAttempts = 0;
                this.sendPing();
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };
            
            this.ws.onclose = (event) => {
                console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
                this.handleReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('❌ Failed to create WebSocket connection:', error);
        }
    }

    sendPing() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'ping',
                timestamp: new Date().toISOString()
            }));
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'pong':
                console.log('📡 Pong received');
                break;
            case 'agent_started':
                console.log(`🚀 Agent started: ${data.agent}`);
                break;
            case 'agent_progress':
                console.log(`⏳ Agent progress: ${data.agent} - ${data.message}`);
                break;
            case 'agent_completed':
                console.log(`✅ Agent completed: ${data.agent}`);
                break;
            case 'participants_list':
                console.log('👥 Participants updated:', data.participants);
                break;
            default:
                console.log('📨 Unknown message type:', data);
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
            setTimeout(() => this.connect(), delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Usage
const client = new OlorinWebSocketClient('INVESTIGATION_123', 'user123', 'investigator', true);
client.connect();
```

### **Admin Log Streaming Example**

```javascript
class AdminLogStreamer {
    constructor(clientId, authToken) {
        this.clientId = clientId;
        this.authToken = authToken;
        this.ws = null;
    }

    connect() {
        // Use appropriate URL based on environment
        const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'wss://api.olorin.ai' 
            : 'ws://localhost:8090';
        const wsUrl = `${baseUrl}/api/admin/logs/stream/${this.clientId}`;
        
        this.ws = new WebSocket(wsUrl);
        
        // Note: WebSocket doesn't support custom headers directly
        // Authentication is handled via query parameters or initial message
        
        this.ws.onopen = () => {
            console.log('✅ Admin log stream connected');
            // Send authentication if required
            this.ws.send(JSON.stringify({
                type: 'auth',
                token: this.authToken
            }));
        };
        
        this.ws.onmessage = (event) => {
            const logEntry = JSON.parse(event.data);
            this.displayLogEntry(logEntry);
        };
        
        this.ws.onclose = (event) => {
            if (event.code === 1008) {
                console.error('❌ Authentication failed or access denied');
            } else {
                console.log('Admin log stream disconnected');
            }
        };
    }

    displayLogEntry(logEntry) {
        console.log(`[${logEntry.timestamp}] ${logEntry.level}: ${logEntry.message}`);
    }
}
```

---

## 🔍 **DEBUGGING WEBSOCKET ISSUES**

### **Common Error Codes and Solutions**

| Error Code | Meaning | Solution |
|------------|---------|----------|
| **404** | Endpoint not found | ✅ Use correct URL patterns above |
| **403** | Access denied | ✅ Check authentication headers/tokens |
| **1008** | Policy violation | ✅ Verify admin permissions for admin endpoints |
| **1006** | Abnormal closure | ✅ Check network connectivity and server status |

### **Debugging Steps**

1. **Verify Server Status:**
   ```bash
   # Production
   curl -s https://api.olorin.ai/health
   
   # Local Development
   curl -s http://localhost:8090/health
   ```

2. **Test WebSocket Connectivity:**
   ```bash
   # Use wscat for testing
   # Production
   wscat -c "wss://api.olorin.ai/ws/test"
   
   # Local Development
   wscat -c "ws://localhost:8090/ws/test"
   ```

3. **Check Investigation Endpoint:**
   ```javascript
   // Browser console test
   // Production
   const ws = new WebSocket('wss://api.olorin.ai/ws/TEST_INV?user_id=test&role=observer');
   
   // Local Development
   const ws = new WebSocket('ws://localhost:8090/ws/TEST_INV?user_id=test&role=observer');
   ws.onopen = () => console.log('✅ Connected');
   ws.onerror = (e) => console.error('❌ Error:', e);
   ```

4. **Verify Authentication:**
   ```javascript
   // Check if authentication headers are properly set
   fetch('/api/admin/users', {
       headers: {
           'Authorization': 'Bearer your-token-here'
       }
   }).then(r => console.log('Auth status:', r.status));
   ```

---

## 📋 **WEBSOCKET MESSAGE PROTOCOLS**

### **Investigation WebSocket Messages**

#### **Client → Server Messages:**
```javascript
// Ping message
{
    "type": "ping",
    "timestamp": "2025-06-25T16:00:00Z"
}

// User activity update
{
    "type": "user_activity",
    "user_id": "user123",
    "activity": "viewing_results"
}

// Request participants list
{
    "type": "get_participants"
}
```

#### **Server → Client Messages:**
```javascript
// Pong response
{
    "type": "pong",
    "timestamp": "2025-06-25T16:00:00Z"
}

// Agent lifecycle events
{
    "type": "agent_started",
    "agent": "Device Analysis",
    "investigation_id": "INV_123",
    "timestamp": "2025-06-25T16:00:00Z"
}

{
    "type": "agent_progress", 
    "agent": "Location Analysis",
    "message": "Analyzing IP geolocation data...",
    "progress": 45,
    "investigation_id": "INV_123"
}

{
    "type": "agent_completed",
    "agent": "Risk Assessment",
    "result": "High risk detected",
    "investigation_id": "INV_123"
}

// Participants update
{
    "type": "participants_list",
    "participants": [
        {
            "user_id": "user123",
            "role": "investigator", 
            "status": "online",
            "last_activity": "2025-06-25T16:00:00Z"
        }
    ]
}
```

---

## ⚠️ **IMPORTANT NOTES**

### **MCP vs WebSocket Confusion**

**MCP (Model Context Protocol) Communication:**
- ✅ Uses HTTP REST endpoints: `/api/mcp-proxy/*`
- ✅ No WebSocket connection required
- ✅ Stateless request/response pattern

**Investigation WebSocket Communication:**
- ✅ Uses WebSocket endpoints: `/ws/*`
- ✅ Real-time bidirectional communication
- ✅ Stateful connection for live updates

### **Authentication Requirements**

**🔐 JWT Token Authentication Required**

All WebSocket connections require JWT authentication tokens passed as query parameters:

```javascript
// Example with JWT token
const token = 'your-jwt-token-here';
const wsUrl = `wss://api.olorin.ai/ws/${investigationId}?token=${token}&user_id=${userId}&role=${role}`;
```

**Authentication Levels:**
1. **Investigation WebSockets:** Require valid JWT token with user authentication
2. **Admin WebSockets:** Require JWT token with admin-level permissions  
3. **MCP Endpoints:** Use standard HTTP authorization headers

**Token Validation:**
- Tokens are validated before WebSocket connection is established
- Invalid tokens result in `WS_1008_POLICY_VIOLATION` close code
- Tokens must contain valid `sub` (subject) claim

### **Production Considerations**

1. **SSL/TLS:** Always use `wss://` in production, never `ws://`
2. **Reconnection Logic:** Implement exponential backoff for reconnections
3. **Heartbeat/Ping:** Send periodic ping messages to maintain connection
4. **Error Handling:** Gracefully handle all WebSocket error scenarios
5. **Resource Cleanup:** Always close WebSocket connections when done

---

## 📞 **SUPPORT AND TROUBLESHOOTING**

If you encounter WebSocket connection issues:

1. **Check the URL pattern** against this guide
2. **Verify authentication** tokens and permissions  
3. **Test with simple endpoints** first (`/ws/test`)
4. **Check browser developer tools** for detailed error messages
5. **Confirm server status** via health endpoints

**Remember:** MCP functionality does NOT use WebSockets - use HTTP REST endpoints instead! 