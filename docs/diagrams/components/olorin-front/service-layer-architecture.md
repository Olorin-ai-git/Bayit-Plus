# SERVICE LAYER ARCHITECTURE

**Component**: olorin-front Service Layer  
**Type**: Backend Integration & API Communication Architecture  
**Created**: January 31, 2025  
**Purpose**: Complete service layer architecture for frontend-backend communication  

---

## 🔧 SERVICE LAYER OVERVIEW

```mermaid
graph TB
    subgraph "Frontend Service Layer"
        FRAUD_SERVICE[fraudInvestigationService.ts<br/>Investigation API Client]
        MCP_CLIENT[MCPClient.ts<br/>AI Tools Client]
        BROWSER_MCP[BrowserMCPClient.ts<br/>Browser Integration]
        HTTP_CLIENT[HTTP Client Layer<br/>Axios Configuration]
    end
    
    subgraph "Communication Protocols"
        REST_API[REST API<br/>HTTP/HTTPS]
        WEBSOCKET[WebSocket<br/>Real-time Communication]
        MCP_PROTOCOL[MCP Protocol<br/>AI Tool Integration]
        FILE_UPLOAD[File Upload<br/>Multipart Forms]
    end
    
    subgraph "Backend Services"
        OLORIN_SERVER[olorin-server<br/>FastAPI Backend]
        API_ENDPOINTS[API Endpoints<br/>Investigation Operations]
        WS_ENDPOINTS[WebSocket Endpoints<br/>Real-time Updates]
        FILE_ENDPOINTS[File Endpoints<br/>Document Management]
    end
    
    subgraph "External Services"
        AI_SERVICES[AI Services<br/>OpenAI, Anthropic]
        SPLUNK_API[Splunk API<br/>SIEM Integration]
        DEVICE_INTEL[Device Intelligence<br/>ThreatMetrix, Iovation]
        LOCATION_SERVICES[Location Services<br/>MaxMind, Google Maps]
    end
    
    subgraph "Authentication & Security"
        JWT_HANDLER[JWT Token Handler<br/>Authentication]
        API_SECURITY[API Security<br/>Request Signing]
        ERROR_HANDLING[Error Handling<br/>Failure Management]
        RETRY_LOGIC[Retry Logic<br/>Resilience Patterns]
    end
    
    %% Service Layer Connections
    FRAUD_SERVICE --> HTTP_CLIENT
    MCP_CLIENT --> BROWSER_MCP
    BROWSER_MCP --> MCP_PROTOCOL
    HTTP_CLIENT --> REST_API
    
    %% Protocol Connections
    REST_API --> API_ENDPOINTS
    WEBSOCKET --> WS_ENDPOINTS
    MCP_PROTOCOL --> AI_SERVICES
    FILE_UPLOAD --> FILE_ENDPOINTS
    
    %% Backend Connections
    API_ENDPOINTS --> OLORIN_SERVER
    WS_ENDPOINTS --> OLORIN_SERVER
    FILE_ENDPOINTS --> OLORIN_SERVER
    
    %% External Service Connections
    OLORIN_SERVER --> SPLUNK_API
    OLORIN_SERVER --> DEVICE_INTEL
    OLORIN_SERVER --> LOCATION_SERVICES
    
    %% Security Layer
    HTTP_CLIENT --> JWT_HANDLER
    JWT_HANDLER --> API_SECURITY
    API_SECURITY --> ERROR_HANDLING
    ERROR_HANDLING --> RETRY_LOGIC
    
    %% Styling
    style FRAUD_SERVICE fill:#9333ea,stroke:#7c3aed,color:white
    style MCP_CLIENT fill:#8b5cf6,stroke:#7c3aed,color:white
    style OLORIN_SERVER fill:#10b981,stroke:#059669,color:white
    style AI_SERVICES fill:#f59e0b,stroke:#d97706,color:white
    style JWT_HANDLER fill:#ef4444,stroke:#dc2626,color:white
```

---

## 🚀 DETAILED SERVICE IMPLEMENTATIONS

### 1. **Fraud Investigation Service**
```mermaid
graph TB
    subgraph "fraudInvestigationService.ts"
        SERVICE_CLASS[FraudInvestigationService<br/>Main Service Class]
        START_INVESTIGATION[startInvestigation()<br/>Initiate Investigation]
        GET_STATUS[getInvestigationStatus()<br/>Check Progress]
        GET_RESULTS[getInvestigationResults()<br/>Retrieve Findings]
        EXPORT_RESULTS[exportInvestigation()<br/>Generate Reports]
    end
    
    subgraph "Request Configuration"
        BASE_CONFIG[Base Configuration<br/>Default Headers & Timeout]
        AUTH_CONFIG[Authentication Config<br/>JWT Token Injection]
        RETRY_CONFIG[Retry Configuration<br/>Exponential Backoff]
        CACHE_CONFIG[Cache Configuration<br/>Response Caching]
    end
    
    subgraph "Response Handling"
        SUCCESS_HANDLER[Success Handler<br/>Data Transformation]
        ERROR_HANDLER[Error Handler<br/>Error Classification]
        VALIDATION[Response Validation<br/>Schema Verification]
        TRANSFORMATION[Data Transformation<br/>Frontend Models]
    end
    
    subgraph "State Management"
        INVESTIGATION_CACHE[Investigation Cache<br/>Local Storage]
        STATUS_CACHE[Status Cache<br/>Real-time Updates]
        RESULTS_CACHE[Results Cache<br/>Performance Optimization]
        ERROR_STATE[Error State<br/>Failure Tracking]
    end
    
    SERVICE_CLASS --> START_INVESTIGATION
    SERVICE_CLASS --> GET_STATUS
    SERVICE_CLASS --> GET_RESULTS
    SERVICE_CLASS --> EXPORT_RESULTS
    
    START_INVESTIGATION --> BASE_CONFIG
    GET_STATUS --> AUTH_CONFIG
    GET_RESULTS --> RETRY_CONFIG
    EXPORT_RESULTS --> CACHE_CONFIG
    
    BASE_CONFIG --> SUCCESS_HANDLER
    AUTH_CONFIG --> ERROR_HANDLER
    RETRY_CONFIG --> VALIDATION
    CACHE_CONFIG --> TRANSFORMATION
    
    SUCCESS_HANDLER --> INVESTIGATION_CACHE
    ERROR_HANDLER --> STATUS_CACHE
    VALIDATION --> RESULTS_CACHE
    TRANSFORMATION --> ERROR_STATE
    
    style SERVICE_CLASS fill:#9333ea,color:white
    style START_INVESTIGATION fill:#10b981,color:white
    style SUCCESS_HANDLER fill:#f59e0b,color:white
    style INVESTIGATION_CACHE fill:#ef4444,color:white
```

### 2. **MCP Client Architecture**
```mermaid
graph TB
    subgraph "MCPClient.ts Core"
        MCP_CLIENT_CLASS[MCPClient<br/>Main Client Class]
        CONNECT_SERVER[connectToServer()<br/>Establish Connection]
        LIST_TOOLS[listTools()<br/>Available Tools]
        CALL_TOOL[callTool()<br/>Execute Tool]
        DISCONNECT[disconnect()<br/>Clean Shutdown]
    end
    
    subgraph "BrowserMCPClient.ts"
        BROWSER_CLIENT[BrowserMCPClient<br/>Browser-specific Implementation]
        INITIALIZE[initializeClient()<br/>Browser Setup]
        HANDLE_REQUESTS[handleToolRequests()<br/>Request Processing]
        MANAGE_CONNECTIONS[manageConnections()<br/>Connection Pool]
        BROWSER_APIS[Browser APIs<br/>Web Integration]
    end
    
    subgraph "Protocol Handling"
        MESSAGE_SERIALIZATION[Message Serialization<br/>JSON-RPC Protocol]
        TOOL_DISCOVERY[Tool Discovery<br/>Available Tools]
        CAPABILITY_NEGOTIATION[Capability Negotiation<br/>Feature Support]
        ERROR_PROPAGATION[Error Propagation<br/>Remote Error Handling]
    end
    
    subgraph "AI Tool Integration"
        OPENAI_TOOLS[OpenAI Tools<br/>GPT Integration]
        ANTHROPIC_TOOLS[Anthropic Tools<br/>Claude Integration]
        CUSTOM_TOOLS[Custom Tools<br/>Domain-specific Tools]
        TOOL_REGISTRY[Tool Registry<br/>Available Tools Management]
    end
    
    MCP_CLIENT_CLASS --> CONNECT_SERVER
    MCP_CLIENT_CLASS --> LIST_TOOLS
    MCP_CLIENT_CLASS --> CALL_TOOL
    MCP_CLIENT_CLASS --> DISCONNECT
    
    BROWSER_CLIENT --> INITIALIZE
    BROWSER_CLIENT --> HANDLE_REQUESTS
    BROWSER_CLIENT --> MANAGE_CONNECTIONS
    BROWSER_CLIENT --> BROWSER_APIS
    
    CONNECT_SERVER --> MESSAGE_SERIALIZATION
    LIST_TOOLS --> TOOL_DISCOVERY
    CALL_TOOL --> CAPABILITY_NEGOTIATION
    DISCONNECT --> ERROR_PROPAGATION
    
    TOOL_DISCOVERY --> OPENAI_TOOLS
    TOOL_DISCOVERY --> ANTHROPIC_TOOLS
    TOOL_DISCOVERY --> CUSTOM_TOOLS
    TOOL_DISCOVERY --> TOOL_REGISTRY
    
    style MCP_CLIENT_CLASS fill:#8b5cf6,color:white
    style BROWSER_CLIENT fill:#c084fc,color:black
    style MESSAGE_SERIALIZATION fill:#10b981,color:white
    style OPENAI_TOOLS fill:#f59e0b,color:white
```

### 3. **HTTP Client Configuration**
```mermaid
graph TB
    subgraph "Axios Configuration"
        AXIOS_INSTANCE[Axios Instance<br/>Configured HTTP Client]
        BASE_URL[Base URL<br/>http://localhost:8090]
        DEFAULT_HEADERS[Default Headers<br/>Content-Type, Accept]
        TIMEOUT_CONFIG[Timeout Configuration<br/>Request & Response Timeouts]
    end
    
    subgraph "Request Interceptors"
        AUTH_INTERCEPTOR[Auth Interceptor<br/>JWT Token Injection]
        LOGGING_INTERCEPTOR[Logging Interceptor<br/>Request Logging]
        CACHE_INTERCEPTOR[Cache Interceptor<br/>Request Deduplication]
        RETRY_INTERCEPTOR[Retry Interceptor<br/>Failed Request Retry]
    end
    
    subgraph "Response Interceptors"
        SUCCESS_INTERCEPTOR[Success Interceptor<br/>Response Normalization]
        ERROR_INTERCEPTOR[Error Interceptor<br/>Error Classification]
        CACHE_RESPONSE[Cache Response<br/>Response Caching]
        TRANSFORM_INTERCEPTOR[Transform Interceptor<br/>Data Transformation]
    end
    
    subgraph "Error Handling"
        NETWORK_ERRORS[Network Errors<br/>Connection Failures]
        HTTP_ERRORS[HTTP Errors<br/>Status Code Errors]
        TIMEOUT_ERRORS[Timeout Errors<br/>Request Timeouts]
        VALIDATION_ERRORS[Validation Errors<br/>Response Schema Errors]
    end
    
    AXIOS_INSTANCE --> BASE_URL
    AXIOS_INSTANCE --> DEFAULT_HEADERS
    AXIOS_INSTANCE --> TIMEOUT_CONFIG
    
    AXIOS_INSTANCE --> AUTH_INTERCEPTOR
    AXIOS_INSTANCE --> LOGGING_INTERCEPTOR
    AXIOS_INSTANCE --> CACHE_INTERCEPTOR
    AXIOS_INSTANCE --> RETRY_INTERCEPTOR
    
    AUTH_INTERCEPTOR --> SUCCESS_INTERCEPTOR
    LOGGING_INTERCEPTOR --> ERROR_INTERCEPTOR
    CACHE_INTERCEPTOR --> CACHE_RESPONSE
    RETRY_INTERCEPTOR --> TRANSFORM_INTERCEPTOR
    
    ERROR_INTERCEPTOR --> NETWORK_ERRORS
    ERROR_INTERCEPTOR --> HTTP_ERRORS
    ERROR_INTERCEPTOR --> TIMEOUT_ERRORS
    ERROR_INTERCEPTOR --> VALIDATION_ERRORS
    
    style AXIOS_INSTANCE fill:#9333ea,color:white
    style AUTH_INTERCEPTOR fill:#10b981,color:white
    style SUCCESS_INTERCEPTOR fill:#f59e0b,color:white
    style NETWORK_ERRORS fill:#ef4444,color:white
```

---

## 🔄 REAL-TIME COMMUNICATION ARCHITECTURE

```mermaid
graph TB
    subgraph "WebSocket Management"
        WS_CONNECTION[WebSocket Connection<br/>ws://localhost:8090/ws]
        CONNECTION_MANAGER[Connection Manager<br/>Auto-reconnect Logic]
        HEARTBEAT_MONITOR[Heartbeat Monitor<br/>Connection Health Check]
        MESSAGE_QUEUE[Message Queue<br/>Pending Messages]
    end
    
    subgraph "Event Handling"
        EVENT_DISPATCHER[Event Dispatcher<br/>Message Routing]
        EVENT_LISTENERS[Event Listeners<br/>Component Subscriptions]
        EVENT_EMITTER[Event Emitter<br/>Component Notifications]
        STATE_SYNC[State Synchronization<br/>UI State Updates]
    end
    
    subgraph "Message Types"
        INVESTIGATION_EVENTS[Investigation Events<br/>Start/Progress/Complete]
        AGENT_EVENTS[Agent Events<br/>Status Updates]
        ERROR_EVENTS[Error Events<br/>Failure Notifications]
        SYSTEM_EVENTS[System Events<br/>Health/Status]
    end
    
    subgraph "Reliability Features"
        AUTO_RECONNECT[Auto Reconnect<br/>Connection Recovery]
        MESSAGE_RETRY[Message Retry<br/>Failed Message Handling]
        OFFLINE_QUEUE[Offline Queue<br/>Offline Message Storage]
        DUPLICATE_DETECTION[Duplicate Detection<br/>Message Deduplication]
    end
    
    WS_CONNECTION --> CONNECTION_MANAGER
    CONNECTION_MANAGER --> HEARTBEAT_MONITOR
    HEARTBEAT_MONITOR --> MESSAGE_QUEUE
    
    MESSAGE_QUEUE --> EVENT_DISPATCHER
    EVENT_DISPATCHER --> EVENT_LISTENERS
    EVENT_LISTENERS --> EVENT_EMITTER
    EVENT_EMITTER --> STATE_SYNC
    
    EVENT_DISPATCHER --> INVESTIGATION_EVENTS
    EVENT_DISPATCHER --> AGENT_EVENTS
    EVENT_DISPATCHER --> ERROR_EVENTS
    EVENT_DISPATCHER --> SYSTEM_EVENTS
    
    CONNECTION_MANAGER --> AUTO_RECONNECT
    MESSAGE_QUEUE --> MESSAGE_RETRY
    MESSAGE_RETRY --> OFFLINE_QUEUE
    OFFLINE_QUEUE --> DUPLICATE_DETECTION
    
    style WS_CONNECTION fill:#9333ea,color:white
    style EVENT_DISPATCHER fill:#10b981,color:white
    style INVESTIGATION_EVENTS fill:#f59e0b,color:white
    style AUTO_RECONNECT fill:#ef4444,color:white
```

---

## 🔒 AUTHENTICATION & SECURITY LAYER

```mermaid
graph TB
    subgraph "Authentication Management"
        JWT_TOKEN[JWT Token<br/>Authentication Token]
        TOKEN_STORAGE[Token Storage<br/>Secure Storage]
        TOKEN_REFRESH[Token Refresh<br/>Automatic Renewal]
        TOKEN_VALIDATION[Token Validation<br/>Expiry Check]
    end
    
    subgraph "Request Security"
        REQUEST_SIGNING[Request Signing<br/>HMAC Signature]
        CSRF_PROTECTION[CSRF Protection<br/>Token Validation]
        RATE_LIMITING[Rate Limiting<br/>Request Throttling]
        INPUT_SANITIZATION[Input Sanitization<br/>XSS Prevention]
    end
    
    subgraph "API Security"
        API_KEY_MANAGEMENT[API Key Management<br/>Service Keys]
        ENDPOINT_AUTHORIZATION[Endpoint Authorization<br/>Permission Checks]
        SECURE_HEADERS[Secure Headers<br/>Security Headers]
        CONTENT_VALIDATION[Content Validation<br/>Response Validation]
    end
    
    subgraph "Error Security"
        ERROR_SANITIZATION[Error Sanitization<br/>Sensitive Data Removal]
        SECURITY_LOGGING[Security Logging<br/>Audit Trail]
        THREAT_DETECTION[Threat Detection<br/>Anomaly Detection]
        INCIDENT_RESPONSE[Incident Response<br/>Security Event Handling]
    end
    
    JWT_TOKEN --> TOKEN_STORAGE
    TOKEN_STORAGE --> TOKEN_REFRESH
    TOKEN_REFRESH --> TOKEN_VALIDATION
    
    TOKEN_VALIDATION --> REQUEST_SIGNING
    REQUEST_SIGNING --> CSRF_PROTECTION
    CSRF_PROTECTION --> RATE_LIMITING
    RATE_LIMITING --> INPUT_SANITIZATION
    
    INPUT_SANITIZATION --> API_KEY_MANAGEMENT
    API_KEY_MANAGEMENT --> ENDPOINT_AUTHORIZATION
    ENDPOINT_AUTHORIZATION --> SECURE_HEADERS
    SECURE_HEADERS --> CONTENT_VALIDATION
    
    CONTENT_VALIDATION --> ERROR_SANITIZATION
    ERROR_SANITIZATION --> SECURITY_LOGGING
    SECURITY_LOGGING --> THREAT_DETECTION
    THREAT_DETECTION --> INCIDENT_RESPONSE
    
    style JWT_TOKEN fill:#9333ea,color:white
    style REQUEST_SIGNING fill:#10b981,color:white
    style API_KEY_MANAGEMENT fill:#f59e0b,color:white
    style ERROR_SANITIZATION fill:#ef4444,color:white
```

---

## 📊 API ENDPOINT MAPPING

### Investigation API Endpoints
```typescript
// Investigation Management
POST   /api/investigations          // Start new investigation
GET    /api/investigations/:id      // Get investigation details
GET    /api/investigations/:id/status // Get investigation status
GET    /api/investigations/:id/results // Get investigation results
POST   /api/investigations/:id/export // Export investigation
DELETE /api/investigations/:id      // Delete investigation

// Agent Management
GET    /api/agents                  // List available agents
POST   /api/agents/:type/start      // Start specific agent
POST   /api/agents/:type/stop       // Stop specific agent
GET    /api/agents/:type/status     // Get agent status
GET    /api/agents/:type/logs       // Get agent logs

// File Management
POST   /api/files/upload            // Upload investigation files
GET    /api/files/:id               // Download file
DELETE /api/files/:id               // Delete file
GET    /api/files/:id/metadata      // Get file metadata
```

### WebSocket Event Types
```typescript
// WebSocket Events
interface WebSocketEvents {
  // Investigation Events
  'investigation:started': { investigationId: string, timestamp: Date }
  'investigation:progress': { investigationId: string, progress: number }
  'investigation:completed': { investigationId: string, results: Results }
  'investigation:failed': { investigationId: string, error: Error }
  
  // Agent Events
  'agent:started': { agentType: string, investigationId: string }
  'agent:progress': { agentType: string, progress: number, message: string }
  'agent:completed': { agentType: string, results: AgentResults }
  'agent:failed': { agentType: string, error: Error }
  
  // System Events
  'system:health': { status: 'healthy' | 'degraded' | 'unhealthy' }
  'system:maintenance': { message: string, duration: number }
}
```

---

## 🚀 PERFORMANCE OPTIMIZATION STRATEGIES

### Caching Strategy
```mermaid
graph LR
    MEMORY_CACHE[Memory Cache<br/>In-memory Storage] --> BROWSER_CACHE[Browser Cache<br/>Local Storage]
    BROWSER_CACHE --> HTTP_CACHE[HTTP Cache<br/>Cache Headers]
    HTTP_CACHE --> CDN_CACHE[CDN Cache<br/>Edge Caching]
    
    style MEMORY_CACHE fill:#9333ea,color:white
    style BROWSER_CACHE fill:#10b981,color:white
    style HTTP_CACHE fill:#f59e0b,color:white
    style CDN_CACHE fill:#ef4444,color:white
```

### Request Optimization
- **Request Batching**: Combine multiple requests into single calls
- **Request Deduplication**: Avoid duplicate simultaneous requests
- **Connection Pooling**: Reuse HTTP connections for efficiency
- **Compression**: Gzip/Brotli compression for request/response bodies

### Error Recovery Patterns
- **Circuit Breaker**: Prevent cascading failures
- **Exponential Backoff**: Intelligent retry timing
- **Graceful Degradation**: Fallback to cached data
- **Health Checks**: Proactive service monitoring

---

## 📱 MOBILE & OFFLINE SUPPORT

```mermaid
graph TB
    subgraph "Offline Capabilities"
        SERVICE_WORKER[Service Worker<br/>Background Processing]
        OFFLINE_CACHE[Offline Cache<br/>Investigation Data]
        SYNC_QUEUE[Sync Queue<br/>Pending Operations]
        CONFLICT_RESOLUTION[Conflict Resolution<br/>Data Reconciliation]
    end
    
    subgraph "Mobile Optimization"
        NETWORK_DETECTION[Network Detection<br/>Connection Monitoring]
        BANDWIDTH_ADAPTATION[Bandwidth Adaptation<br/>Quality Adjustment]
        BATTERY_OPTIMIZATION[Battery Optimization<br/>Power Management]
        BACKGROUND_SYNC[Background Sync<br/>Offline Operations]
    end
    
    SERVICE_WORKER --> OFFLINE_CACHE
    OFFLINE_CACHE --> SYNC_QUEUE
    SYNC_QUEUE --> CONFLICT_RESOLUTION
    
    NETWORK_DETECTION --> BANDWIDTH_ADAPTATION
    BANDWIDTH_ADAPTATION --> BATTERY_OPTIMIZATION
    BATTERY_OPTIMIZATION --> BACKGROUND_SYNC
    
    style SERVICE_WORKER fill:#9333ea,color:white
    style NETWORK_DETECTION fill:#10b981,color:white
```

---

## 🔧 SERVICE CONFIGURATION

### Environment Configuration
```typescript
interface ServiceConfig {
  apiBaseUrl: string
  websocketUrl: string
  mcpServerUrl: string
  authConfig: {
    tokenStorageKey: string
    refreshTokenKey: string
    tokenExpiryBuffer: number
  }
  httpConfig: {
    timeout: number
    retryAttempts: number
    retryDelay: number
  }
  websocketConfig: {
    reconnectAttempts: number
    reconnectDelay: number
    heartbeatInterval: number
  }
}
```

### Development vs Production Settings
```typescript
const developmentConfig: ServiceConfig = {
  apiBaseUrl: 'http://localhost:8090',
  websocketUrl: 'ws://localhost:8090/ws',
  mcpServerUrl: 'ws://localhost:8001/mcp',
  // ... development settings
}

const productionConfig: ServiceConfig = {
  apiBaseUrl: 'https://api.olorin.example.com',
  websocketUrl: 'wss://api.olorin.example.com/ws',
  mcpServerUrl: 'wss://mcp.olorin.example.com/mcp',
  // ... production settings
}
```

---

## 📈 MONITORING & OBSERVABILITY

### Service Metrics
- **Request/Response Times**: API performance monitoring
- **Error Rates**: Service reliability tracking
- **WebSocket Health**: Real-time connection monitoring
- **Cache Hit Rates**: Caching effectiveness metrics

### User Experience Metrics
- **API Response Times**: User-perceived performance
- **Failed Request Recovery**: Error handling effectiveness
- **Offline Functionality**: Offline capability usage
- **Real-time Update Latency**: WebSocket performance

---

**Last Updated**: January 31, 2025  
**Service Layer Version**: 1.0  
**API Integration**: REST + WebSocket + MCP  
**Security**: JWT + HTTPS + Request Signing 