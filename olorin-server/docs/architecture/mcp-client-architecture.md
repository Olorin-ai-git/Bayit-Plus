# MCP Client Architecture for Olorin

## Overview

Olorin operates as an MCP **client**, not a server. It connects to external MCP servers to access specialized fraud detection capabilities while keeping its own tools internal for autonomous investigation workflows.

## Key Architectural Decisions

### 1. Olorin as MCP Client Only
- **Rationale**: Olorin runs autonomous investigations, it doesn't serve other clients
- **Implementation**: Remove MCP server code, implement MCP client connections
- **Benefits**: Clear separation of concerns, focused architecture

### 2. Internal Tools Remain Private
All existing Olorin tools remain internal LangChain tools:
- Splunk, SumoLogic, Snowflake integration
- Threat intelligence tools (AbuseIPDB, VirusTotal, Shodan)
- Database, file system, web search tools
- These are NOT exposed via MCP

### 3. External MCP Connections
Olorin connects as a client to external MCP servers for:
- **Blockchain Analysis**: Chainalysis, Elliptic, TRM Labs
- **Intelligence Gathering**: OSINT aggregators, dark web monitors
- **ML/AI Models**: Fraud detection models, behavioral analysis
- **Communication**: Slack, Teams, email platforms
- **Compliance**: AML, GDPR, regulatory checking services

## Implementation Structure

```
app/
├── service/
│   ├── agent/
│   │   ├── tools/                    # Internal LangChain tools
│   │   │   ├── splunk_tool/
│   │   │   ├── threat_intelligence_tool/
│   │   │   └── ... (all internal tools)
│   │   │
│   │   └── mcp_client/               # NEW: MCP client infrastructure
│   │       ├── client_manager.py     # Manages external MCP connections
│   │       ├── blockchain_client.py  # Blockchain service connections
│   │       ├── intelligence_client.py # OSINT/SOCMINT connections
│   │       ├── ml_client.py          # ML model server connections
│   │       └── compliance_client.py  # Compliance service connections
│   │
│   └── mcp_server/                   # TO BE REMOVED
```

## Migration Steps

1. **Phase 1: Remove MCP Server**
   - Archive existing MCP server code
   - Remove server dependencies from pyproject.toml
   - Update documentation

2. **Phase 2: Implement MCP Client Manager**
   - Create client connection infrastructure
   - Implement service discovery
   - Add authentication and security

3. **Phase 3: Connect to External Services**
   - Blockchain analysis servers
   - Intelligence gathering servers
   - ML/AI model servers
   - Communication platforms
   - Compliance services

## Benefits of This Architecture

1. **Clear Separation**: Internal tools vs external services
2. **Security**: No exposure of internal capabilities
3. **Scalability**: Easy to add new external MCP connections
4. **Maintainability**: Simpler architecture, focused purpose
5. **Flexibility**: Can switch external providers easily

## Security Considerations

- All external MCP connections require authentication
- API keys stored in Firebase Secrets Manager
- Circuit breakers for external service failures
- Rate limiting and quota management
- Audit logging for all external tool invocations

## Next Steps

1. Remove MCP server code from `app/mcp_server/`
2. Implement MCP client manager
3. Create specific clients for each service category
4. Update agent orchestration to use MCP clients
5. Test with external MCP servers