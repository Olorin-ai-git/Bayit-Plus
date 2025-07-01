# API ARCHITECTURE

**Type**: REST API and WebSocket Architecture  
**Created**: January 31, 2025  
**Purpose**: Complete API design and endpoint architecture for the Olorin platform  
**Scope**: REST endpoints, WebSocket connections, authentication, and API management  

---

## 🔗 COMPLETE API ARCHITECTURE

```mermaid
graph TD
    subgraph "API Gateway Layer"
        API_GATEWAY[API Gateway<br/>Nginx/Kong]
        LOAD_BALANCER[Load Balancer<br/>Request Distribution]
        RATE_LIMITER[Rate Limiter<br/>Request Throttling]
        API_VERSIONING[API Versioning<br/>Version Management]
    end
    
    subgraph "Authentication Layer"
        JWT_VALIDATION[JWT Validation<br/>Token Verification]
        API_KEY_AUTH[API Key Authentication<br/>Service Access]
        OAUTH_HANDLER[OAuth Handler<br/>Third-party Auth]
        PERMISSION_CHECK[Permission Check<br/>Role-based Access]
    end
    
    subgraph "REST API Endpoints"
        INVESTIGATION_API[Investigation API<br/>/api/v1/investigations]
        AGENTS_API[Agents API<br/>/api/v1/agents]
        USERS_API[Users API<br/>/api/v1/users]
        REPORTS_API[Reports API<br/>/api/v1/reports]
        CONFIG_API[Configuration API<br/>/api/v1/config]
    end
    
    subgraph "WebSocket Connections"
        REALTIME_UPDATES[Real-time Updates<br/>Investigation Progress]
        NOTIFICATION_WS[Notifications<br/>System Alerts]
        AGENT_STATUS_WS[Agent Status<br/>Live Agent Monitoring]
        CHAT_WS[Chat Interface<br/>AI Assistant Communication]
    end
    
    subgraph "API Documentation"
        OPENAPI_SPEC[OpenAPI Specification<br/>API Schema Definition]
        SWAGGER_UI[Swagger UI<br/>Interactive Documentation]
        POSTMAN_COLLECTION[Postman Collection<br/>API Testing]
        SDK_GENERATION[SDK Generation<br/>Client Libraries]
    end
    
    %% Gateway Flow
    API_GATEWAY --> LOAD_BALANCER
    LOAD_BALANCER --> RATE_LIMITER
    RATE_LIMITER --> API_VERSIONING
    
    %% Authentication Flow
    API_VERSIONING --> JWT_VALIDATION
    JWT_VALIDATION --> API_KEY_AUTH
    API_KEY_AUTH --> OAUTH_HANDLER
    OAUTH_HANDLER --> PERMISSION_CHECK
    
    %% API Routing
    PERMISSION_CHECK --> INVESTIGATION_API
    PERMISSION_CHECK --> AGENTS_API
    PERMISSION_CHECK --> USERS_API
    PERMISSION_CHECK --> REPORTS_API
    PERMISSION_CHECK --> CONFIG_API
    
    %% WebSocket Integration
    PERMISSION_CHECK --> REALTIME_UPDATES
    PERMISSION_CHECK --> NOTIFICATION_WS
    PERMISSION_CHECK --> AGENT_STATUS_WS
    PERMISSION_CHECK --> CHAT_WS
    
    %% Documentation
    INVESTIGATION_API --> OPENAPI_SPEC
    AGENTS_API --> SWAGGER_UI
    USERS_API --> POSTMAN_COLLECTION
    REPORTS_API --> SDK_GENERATION
    
    %% Styling
    style API_GATEWAY fill:#9333ea,stroke:#7c3aed,color:white
    style JWT_VALIDATION fill:#10b981,stroke:#059669,color:white
    style INVESTIGATION_API fill:#f59e0b,stroke:#d97706,color:white
    style REALTIME_UPDATES fill:#ef4444,stroke:#dc2626,color:white
    style OPENAPI_SPEC fill:#8b5cf6,stroke:#7c3aed,color:white
```

---

**Last Updated**: January 31, 2025  
**API Version**: v1  
**Total Endpoints**: 45+ REST endpoints, 4 WebSocket connections  
**Response Time**: <200ms average API response
