# MCP Architecture Refactor Plan

**Author:** Gil Klainert  
**Date:** 2025-09-02  
**Status:** Proposed  
**Related Diagrams:** [MCP Architecture Overview](/docs/diagrams/mcp-architecture-overview.md), [MCP Data Flow](/docs/diagrams/mcp-data-flow.md)

## Executive Summary

This plan addresses the architectural clarification and proper implementation of Model Context Protocol (MCP) in the Olorin system. Based on the analysis, Olorin currently has an MCP Server implementation that exposes its investigation tools to Claude Desktop. The user indicates we should only have MCP client code, suggesting a fundamental architectural shift is needed.

## Current State Analysis

### Existing MCP Components

1. **Olorin MCP Server** (`/olorin-server/app/mcp_server/`)
   - Acts as an MCP Server using `from mcp.server import Server`
   - Exposes Olorin's LangGraph agents and LangChain tools via MCP protocol
   - Designed for Claude Desktop to consume Olorin's investigation capabilities
   - Runs as a separate process via stdio transport

2. **Gaia MCP Client** (`/Gaia/gaia-tools/gaiatools/mcp/`)
   - Implements MCP client functionality
   - Can connect to external MCP servers
   - Wraps MCP tools for use within Gaia system

### Current Architecture Pattern

```
Claude Desktop --> [MCP Protocol] --> Olorin MCP Server --> Olorin Investigation Tools
Gaia System --> [MCP Client] --> External MCP Servers (Slack, Google, etc.)
```

## Architectural Decision

### Core Principle

Based on the requirement that "we should only have MCP client code, not server code," the architecture should be:

**Olorin as MCP Consumer (Client-Only Architecture)**
- Remove MCP Server functionality from Olorin
- Implement MCP Client to consume external tools
- Integrate MCP tools as part of Olorin's investigation toolkit

### Rationale

1. **Separation of Concerns**: Olorin should focus on being an investigation platform that consumes tools, not a tool provider
2. **Simplified Architecture**: Maintaining only client code reduces complexity
3. **Better Integration**: MCP tools become first-class citizens in Olorin's agent system
4. **Scalability**: Easier to add new MCP tool sources without modifying server code

## Implementation Plan

### Phase 1: Architecture Assessment and Planning
**Duration:** 1 day  
**Status:** ⏳ PENDING

#### Tasks:
1. Document all current MCP touchpoints in the codebase
2. Identify dependencies on MCP server functionality
3. Map out required MCP client capabilities
4. Create migration strategy for existing integrations

#### Deliverables:
- Complete MCP dependency analysis document
- Migration risk assessment
- Client capability requirements specification

### Phase 2: MCP Client Implementation
**Duration:** 3 days  
**Status:** ⏳ PENDING

#### Tasks:
1. Create new MCP client module in `/olorin-server/app/integrations/mcp_client/`
2. Implement MCP client connection management
3. Create tool discovery and invocation mechanisms
4. Build configuration system for MCP servers
5. Implement error handling and retry logic

#### Deliverables:
- MCP client module with:
  - `mcp_client.py` - Core client implementation
  - `mcp_config.py` - Configuration management
  - `mcp_tools.py` - Tool wrapper implementations
  - `mcp_registry.py` - Tool registry and discovery

### Phase 3: Agent Integration
**Duration:** 2 days  
**Status:** ⏳ PENDING

#### Tasks:
1. Create MCP tool adapters for LangChain
2. Integrate MCP tools into existing agent workflows
3. Update agent configurations to use MCP tools
4. Implement tool selection logic based on capabilities

#### Deliverables:
- LangChain tool adapters for MCP
- Updated agent configurations
- Tool capability mapping

### Phase 4: Remove MCP Server Code
**Duration:** 1 day  
**Status:** ⏳ PENDING

#### Tasks:
1. Remove `/olorin-server/app/mcp_server/` directory
2. Remove MCP server dependencies from `pyproject.toml`
3. Update startup scripts to remove MCP server references
4. Clean up MCP server documentation

#### Deliverables:
- Clean codebase without MCP server components
- Updated dependency files
- Revised documentation

### Phase 5: Configuration and Testing
**Duration:** 2 days  
**Status:** ⏳ PENDING

#### Tasks:
1. Create MCP client configuration schema
2. Implement configuration validation
3. Create comprehensive test suite for MCP client
4. Test integration with multiple MCP servers
5. Performance testing and optimization

#### Deliverables:
- Configuration schema and examples
- Complete test coverage (>85%)
- Performance benchmarks

### Phase 6: Documentation and Migration
**Duration:** 1 day  
**Status:** ⏳ PENDING

#### Tasks:
1. Update all MCP-related documentation
2. Create migration guide for existing users
3. Document new MCP client API
4. Create usage examples and best practices

#### Deliverables:
- Updated documentation suite
- Migration guide
- API documentation
- Usage examples

## Technical Architecture

### New MCP Client Architecture

```python
# /olorin-server/app/integrations/mcp_client/

mcp_client/
├── __init__.py
├── mcp_client.py       # Core MCP client implementation
├── mcp_config.py       # Configuration management
├── mcp_tools.py        # Tool wrappers and adapters
├── mcp_registry.py     # Tool discovery and registry
└── mcp_exceptions.py   # Custom exceptions
```

### Integration Pattern

```python
# Example integration in agents.py
from app.integrations.mcp_client import MCPToolRegistry

class InvestigationAgent:
    def __init__(self):
        self.mcp_registry = MCPToolRegistry()
        self.tools = self._initialize_tools()
    
    def _initialize_tools(self):
        # Combine local tools with MCP tools
        local_tools = [...]
        mcp_tools = self.mcp_registry.get_available_tools()
        return local_tools + mcp_tools
```

### Configuration Schema

```yaml
# /olorin-server/config/mcp_clients.yaml
mcp_servers:
  - name: "slack"
    command: ["npx", "-y", "@modelcontextprotocol/server-slack"]
    env:
      SLACK_TOKEN: "${SLACK_TOKEN}"
    capabilities:
      - messaging
      - file_access
  
  - name: "github"
    command: ["npx", "-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_TOKEN: "${GITHUB_TOKEN}"
    capabilities:
      - code_search
      - issue_management
```

## Migration Strategy

### For Existing Users

1. **Deprecation Notice**: Announce MCP server deprecation with 30-day notice
2. **Parallel Operation**: Run both server and client for transition period
3. **Migration Tools**: Provide scripts to convert configurations
4. **Support Period**: Maintain legacy documentation for 60 days

### For Claude Desktop Users

Since Claude Desktop currently connects to Olorin's MCP server, we need to:

1. **Alternative Solution**: Document how to use Olorin via API instead of MCP
2. **Bridge Option**: Create a thin MCP server proxy if absolutely needed
3. **Communication**: Clear documentation on the architectural change

## Risk Analysis

### High Risks
- **Breaking Change**: Existing Claude Desktop integrations will break
- **Data Migration**: Configuration and credentials need migration
- **Learning Curve**: Users need to understand new architecture

### Mitigation Strategies
- Provide comprehensive migration documentation
- Create automated migration scripts
- Maintain parallel operation during transition
- Extensive testing before full cutover

## Success Criteria

1. **Functional Requirements**
   - All MCP client functionality working
   - Successful integration with 3+ external MCP servers
   - All agent workflows functioning with MCP tools

2. **Performance Requirements**
   - Tool invocation latency < 500ms
   - Connection establishment < 2 seconds
   - Memory usage < 100MB for client

3. **Quality Requirements**
   - Test coverage > 85%
   - Zero critical bugs in production
   - Documentation coverage 100%

## Timeline Summary

- **Total Duration**: 10 days
- **Phase 1**: Day 1 - Assessment and Planning
- **Phase 2**: Days 2-4 - MCP Client Implementation
- **Phase 3**: Days 5-6 - Agent Integration
- **Phase 4**: Day 7 - Remove MCP Server
- **Phase 5**: Days 8-9 - Configuration and Testing
- **Phase 6**: Day 10 - Documentation and Migration

## Conclusion

This refactor aligns Olorin's architecture with the principle of being an MCP consumer rather than provider. By implementing a robust MCP client and removing the server components, we achieve a cleaner, more maintainable architecture that better fits Olorin's role as an investigation platform that leverages external tools and services.

## Next Steps

1. Review and approve this plan
2. Create feature branch for implementation
3. Begin Phase 1 assessment tasks
4. Set up tracking for progress monitoring

## References

- [MCP Specification](https://github.com/modelcontextprotocol/specification)
- [Current MCP Integration Summary](/docs/integration/MCP_INTEGRATION_SUMMARY.md)
- [Gaia MCP Client Implementation](/Gaia/gaia-tools/gaiatools/mcp/)