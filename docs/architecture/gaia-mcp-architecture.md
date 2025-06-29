# OLORIN-MCP Architecture Documentation

## Project Overview
**OLORIN-MCP** is the Model Context Protocol server component of the OLORIN ecosystem, providing a standardized interface for tool management, execution, and cross-service communication following the MCP specification.

## High-Level Architecture

### MCP Service Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                      OLORIN-MCP Service                          │
├─────────────────────────────────────────────────────────────────┤
│  MCP Protocol Layer                                            │
│  ├── Prompts Management                                        │
│  ├── Tools Discovery & Execution                               │
│  ├── Resource Management                                       │
│  └── Protocol Compliance                                       │
├─────────────────────────────────────────────────────────────────┤
│  Service Management                                             │
│  ├── Health Monitoring                                         │
│  ├── Configuration Management                                  │
│  ├── Authentication & Authorization                            │
│  └── Cross-Service Communication                               │
├─────────────────────────────────────────────────────────────────┤
│  Tool Integration Layer                                         │
│  ├── OLORIN Tools Adapter                                        │
│  ├── Splunk Integration                                         │
│  ├── OII Tools                                                 │
│  └── Custom Tool Registry                                      │
├─────────────────────────────────────────────────────────────────┤
│  External Interfaces                                           │
│  ├── Main OLORIN Service (Port 8000)                            │
│  ├── Frontend Applications                                     │
│  ├── MCP Clients                                              │
│  └── Third-party Integrations                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### MCP Server (Port 3000)
- **Framework**: FastAPI with MCP protocol implementation
- **Protocol**: Model Context Protocol (MCP) specification compliance
- **Tools**: 7+ integrated tools for investigation and analysis
- **Communication**: REST API and WebSocket support

### Key Directories
1. **`app/main.py`**: MCP server entry point and application setup
2. **`app/routers/`**: MCP protocol endpoints (prompts, tools)
3. **`app/service/`**: Service layer for tool management and execution
4. **`app/models/`**: MCP protocol models and data structures
5. **`app/tools/`**: Tool implementations and adapters

## MCP Protocol Implementation

### Supported Capabilities
```
MCP Protocol Features:
├── Tools Discovery (/tools)
├── Tool Execution (/tools/{tool_name}/call)
├── Prompts Management (/prompts)
├── Health Monitoring (/health)
└── Resource Management (future)
```

### Tool Registry
- **Splunk Tools**: Query execution and data analysis
- **OII Tools**: Identity and location services
- **OLORIN Tools**: Investigation workflow tools
- **Vector Search**: Semantic search capabilities
- **Custom Tools**: Extensible tool framework

## Service Communication

### Internal Communication
```
OLORIN-MCP ↔ Main OLORIN Service
├── Tool execution requests
├── Investigation data exchange
├── Authentication token validation
└── Real-time status updates

OLORIN-MCP ↔ OLORIN-Tools
├── Tool discovery and registration
├── Execution delegation
├── Result formatting
└── Error handling
```

### External Integrations
- **Splunk SIEM**: Direct API integration for security queries
- **Identity Services**: OII and enterprise identity providers
- **Vector Databases**: Semantic search and retrieval
- **Web Services**: Tavily and other external APIs

## Deployment Architecture

### Container Configuration
- **Docker**: Multi-stage build with optimized image
- **Poetry**: Dependency management and virtual environments
- **Health Checks**: Automated health monitoring
- **Scaling**: Horizontal scaling support

### Environment Support
- **Local Development**: Docker Compose with hot reload
- **E2E Testing**: Kubernetes deployment in test namespace
- **Production**: Enterprise Kubernetes clusters with monitoring

## Performance Characteristics

### Response Times
- **Tool Discovery**: <50ms for tool enumeration
- **Tool Execution**: Variable based on tool complexity
- **Health Checks**: <10ms response time
- **Cross-Service Communication**: <100ms latency

### Scalability Features
- **Stateless Design**: No session storage requirements
- **Horizontal Scaling**: Multiple instance support
- **Load Balancing**: Round-robin distribution
- **Circuit Breakers**: Fault tolerance for external services

## Security Architecture

### Authentication
- **Token Validation**: JWT token verification
- **Service Mesh**: mTLS for service-to-service communication
- **API Security**: Rate limiting and request validation
- **Audit Logging**: Comprehensive request/response logging

### Authorization
- **Tool Access Control**: Permission-based tool execution
- **Resource Isolation**: Tenant-based resource separation
- **Security Headers**: CORS and security header enforcement
- **Input Validation**: Comprehensive request sanitization

## Technology Stack

### Core Technologies
- **Python 3.11+**: Runtime environment
- **FastAPI**: Web framework with async support
- **Pydantic**: Data validation and serialization
- **httpx**: Async HTTP client for external services
- **Poetry**: Dependency management

### MCP Integration
- **MCP Protocol**: Official MCP specification compliance
- **JSON-RPC**: Protocol message format
- **WebSocket**: Real-time communication support
- **OpenAPI**: Auto-generated API documentation

## Monitoring & Observability

### Health Monitoring
- **Service Health**: `/health` endpoint with service status
- **Tool Health**: Individual tool availability checks
- **Dependency Health**: External service connectivity
- **Performance Metrics**: Response time and throughput

### Logging Strategy
- **Structured Logging**: JSON-formatted log messages
- **Request Tracing**: End-to-end request tracking
- **Error Logging**: Comprehensive error capture
- **Audit Trail**: Tool execution and access logging

## Future Enhancements

### Protocol Extensions
- **Resource Management**: File and data resource handling
- **Streaming Support**: Large data streaming capabilities
- **Batch Operations**: Multi-tool execution support
- **Event Subscriptions**: Real-time event notifications

### Tool Ecosystem
- **Plugin Architecture**: Dynamic tool loading
- **Tool Marketplace**: Community tool sharing
- **Custom Tool SDK**: Developer tool creation kit
- **Tool Versioning**: Backward compatibility support

---

**Document Version**: 1.0  
**Last Updated**: January 28, 2025  
**Architecture Owner**: OLORIN-MCP Development Team  
**MCP Version**: 1.0-compatible
