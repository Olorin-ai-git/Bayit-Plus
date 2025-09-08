# LangGraph Clean Architecture Plan

**Author**: Gil Klainert  
**Date**: 2025-09-08  
**Status**: Approved for Implementation

## Executive Summary

This document outlines a comprehensive plan to rebuild the LangGraph state graph from scratch, addressing current issues with tool execution, message flow, and agent coordination. The new architecture will properly integrate all 52 tools, implement a central orchestrator agent, and include all 5 domain agents with proper Snowflake-first investigation flow.

## Current Issues

1. **Tool Execution Errors**: `tool_use` blocks without corresponding `tool_result` blocks
2. **Circular References**: Agents have edges to tools and tools back to agents
3. **Message Flow Issues**: Improper sequencing of tool calls and results
4. **Lack of Central Coordination**: No single orchestrator managing the investigation
5. **Snowflake Integration**: Not properly prioritized as the primary tool

## Architecture Overview

### Core Components

1. **Orchestrator Agent**: Central coordinator managing investigation flow
2. **Tools Node**: Single node executing all 52 bound tools
3. **Domain Agents**: 5 specialized agents (network, device, location, logs, risk)
4. **Data Ingestion Node**: Handles raw data and initial Snowflake queries
5. **Summary Node**: Consolidates findings and generates final report

## Phase 1: Core Architecture Design

### 1.1 State Schema Definition

```python
from typing import TypedDict, List, Dict, Any, Annotated
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class InvestigationState(TypedDict):
    """Complete investigation state for fraud detection."""
    messages: Annotated[List[BaseMessage], add_messages]
    investigation_id: str
    entity_id: str
    entity_type: str
    current_phase: str  # "initialization", "snowflake_analysis", "tool_execution", "domain_analysis", "summary"
    domain_findings: Dict[str, Any]  # Findings from each domain agent
    risk_score: float
    tools_used: List[str]  # Track which tools have been used
    snowflake_data: Dict[str, Any]  # 30-day Snowflake analysis results
    tool_requests: List[Dict[str, Any]]  # Pending tool requests from agents
    parallel_execution: bool  # Whether to run agents in parallel
```

### 1.2 Graph Components

- **Orchestrator Agent**: Central coordinator that manages investigation flow
- **Tools Node**: Executes all 52 bound tools based on orchestrator decisions
- **Domain Agents**: 5 specialized agents analyzing specific aspects
- **Data Ingestion Node**: Handles raw data and prepares for analysis
- **Summary Node**: Consolidates all findings into final report

## Phase 2: Tool Integration Strategy

### 2.1 Tool Binding Architecture

```python
from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools
from langgraph.prebuilt import ToolNode
from langchain_anthropic import ChatAnthropic

# Initialize and get all 52 tools
initialize_tools()
tools = get_tools_for_agent(
    categories=[
        "olorin",           # Snowflake, Splunk, SumoLogic
        "threat_intelligence",  # AbuseIPDB, VirusTotal, Shodan
        "database",         # Database query tools
        "search",           # Vector search
        "blockchain",       # Crypto analysis
        "intelligence",     # OSINT, social media
        "ml_ai",           # ML-powered analysis
        "web",             # Web search and scraping
        "file_system",     # File operations
        "api",             # HTTP and JSON API tools
        "mcp_clients",     # External MCP connections
        "utility"          # Utility tools
    ]
)

# Ensure Snowflake is first tool
from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeQueryTool
if not any(isinstance(t, SnowflakeQueryTool) for t in tools):
    tools.insert(0, SnowflakeQueryTool())

# Bind tools to orchestrator LLM
orchestrator_llm = ChatAnthropic(
    model="claude-opus-4-1-20250805",
    temperature=0.3,  # Lower temperature for orchestration
    max_tokens=8000
).bind_tools(tools)

# Create single ToolNode for graph
tool_executor = ToolNode(tools)
```

### 2.2 Tool Categories and Priority

1. **Primary Tool**: Snowflake (30-day lookback MANDATORY)
2. **Threat Intelligence**: VirusTotal, AbuseIPDB, Shodan
3. **Database/SIEM**: Splunk, SumoLogic
4. **Blockchain Analysis**: Crypto investigation tools
5. **ML/AI Analysis**: Pattern detection and anomaly analysis
6. **Web/OSINT**: Open source intelligence gathering
7. **Utility Tools**: Supporting functionality

## Phase 3: Orchestrator Agent Design

### 3.1 Orchestrator Responsibilities

1. **Phase Management**: Control investigation phases
2. **Snowflake First**: Ensure 30-day Snowflake analysis happens first
3. **Tool Selection**: Decide which tools to use based on findings
4. **Agent Routing**: Determine which domain agents to activate
5. **Result Consolidation**: Gather and synthesize findings
6. **Risk Assessment**: Calculate overall risk score

### 3.2 Orchestrator Node Implementation

```python
async def orchestrator_agent(state: InvestigationState) -> Dict:
    """Central orchestrator managing the investigation flow."""
    
    current_phase = state.get("current_phase", "initialization")
    
    # Phase 1: Initialization
    if current_phase == "initialization":
        # Prepare for Snowflake analysis
        return {
            "current_phase": "snowflake_analysis",
            "messages": [SystemMessage(content="Starting fraud investigation with Snowflake analysis")]
        }
    
    # Phase 2: Mandatory Snowflake Analysis (30 days)
    elif current_phase == "snowflake_analysis":
        if not state.get("snowflake_data"):
            # Create Snowflake query for 30-day analysis
            snowflake_prompt = f"""
            Query Snowflake for ALL records related to {state['entity_id']} 
            over the past 30 days. Look for:
            - Transaction patterns
            - Risk scores
            - Fraud indicators
            - Related entities
            """
            
            # Orchestrator decides to use Snowflake tool
            response = await orchestrator_llm.ainvoke([
                SystemMessage(content="You must use the snowflake_query_tool first."),
                HumanMessage(content=snowflake_prompt)
            ])
            
            return {
                "messages": [response],
                "current_phase": "snowflake_analysis"
            }
        else:
            # Snowflake complete, move to tool execution
            return {
                "current_phase": "tool_execution"
            }
    
    # Phase 3: Additional Tool Execution
    elif current_phase == "tool_execution":
        # Analyze Snowflake results and determine additional tools
        snowflake_data = state.get("snowflake_data", {})
        
        # Select tools based on findings
        tool_selection_prompt = f"""
        Based on Snowflake findings: {snowflake_data}
        Select additional tools for investigation.
        Focus on threat intelligence and verification tools.
        """
        
        response = await orchestrator_llm.ainvoke([
            SystemMessage(content="Select and use relevant tools for deep investigation."),
            HumanMessage(content=tool_selection_prompt)
        ])
        
        return {
            "messages": [response],
            "current_phase": "tool_execution"
        }
    
    # Phase 4: Domain Analysis
    elif current_phase == "domain_analysis":
        # Route to domain agents
        return {
            "current_phase": "domain_analysis",
            "parallel_execution": True  # Run agents in parallel
        }
    
    # Phase 5: Summary
    elif current_phase == "summary":
        # Consolidate all findings
        return {
            "current_phase": "complete"
        }
    
    return state
```

## Phase 4: Domain Agent Integration

### 4.1 Agent Nodes (State-Based Communication)

```python
async def network_agent(state: InvestigationState) -> Dict:
    """Network domain analysis agent."""
    
    # Get Snowflake data relevant to network analysis
    snowflake_data = state.get("snowflake_data", {})
    
    # Analyze network aspects
    network_findings = {
        "ip_analysis": analyze_ip_patterns(snowflake_data),
        "geo_analysis": analyze_geographic_patterns(snowflake_data),
        "vpn_detection": check_vpn_indicators(snowflake_data),
        "risk_indicators": []
    }
    
    # Request specific tools through state (not direct execution)
    tool_requests = [
        {"tool": "virustotal_tool", "args": {"ip": state["entity_id"]}},
        {"tool": "abuseipdb_tool", "args": {"ip": state["entity_id"]}},
        {"tool": "shodan_tool", "args": {"ip": state["entity_id"]}}
    ]
    
    # Update domain findings
    domain_findings = state.get("domain_findings", {})
    domain_findings["network"] = network_findings
    
    return {
        "domain_findings": domain_findings,
        "tool_requests": state.get("tool_requests", []) + tool_requests
    }

async def device_agent(state: InvestigationState) -> Dict:
    """Device fingerprint analysis agent."""
    
    snowflake_data = state.get("snowflake_data", {})
    
    device_findings = {
        "device_consistency": analyze_device_patterns(snowflake_data),
        "spoofing_indicators": detect_spoofing(snowflake_data),
        "browser_analysis": analyze_browser_data(snowflake_data)
    }
    
    domain_findings = state.get("domain_findings", {})
    domain_findings["device"] = device_findings
    
    return {"domain_findings": domain_findings}

# Similar implementations for location_agent, logs_agent, risk_agent
```

### 4.2 Agent Coordination Strategy

- **Parallel Execution**: Default for independent domain analysis
- **Sequential Execution**: When dependencies exist between agents
- **Conditional Routing**: Based on investigation requirements

## Phase 5: Graph Construction

### 5.1 Node Addition

```python
from langgraph.graph import StateGraph, START, END

def build_investigation_graph():
    """Build the complete investigation graph."""
    
    builder = StateGraph(InvestigationState)
    
    # Core orchestration nodes
    builder.add_node("orchestrator", orchestrator_agent)
    builder.add_node("tools", tool_executor)
    
    # Domain analysis nodes
    builder.add_node("network_agent", network_agent)
    builder.add_node("device_agent", device_agent)
    builder.add_node("location_agent", location_agent)
    builder.add_node("logs_agent", logs_agent)
    builder.add_node("risk_agent", risk_agent)
    
    # Support nodes
    builder.add_node("data_ingestion", data_ingestion_node)
    builder.add_node("summary", summary_node)
    
    return builder
```

### 5.2 Edge Definition

```python
def define_graph_edges(builder):
    """Define all edges and routing logic."""
    
    # Entry point
    builder.add_edge(START, "data_ingestion")
    
    # Data ingestion to orchestrator
    builder.add_edge("data_ingestion", "orchestrator")
    
    # Orchestrator routing logic
    builder.add_conditional_edges(
        "orchestrator",
        route_from_orchestrator,
        {
            "tools": "tools",
            "network_agent": "network_agent",
            "device_agent": "device_agent",
            "location_agent": "location_agent",
            "logs_agent": "logs_agent",
            "risk_agent": "risk_agent",
            "summary": "summary"
        }
    )
    
    # Tools always return to orchestrator
    builder.add_edge("tools", "orchestrator")
    
    # All agents return to orchestrator
    for agent in ["network_agent", "device_agent", "location_agent", "logs_agent", "risk_agent"]:
        builder.add_edge(agent, "orchestrator")
    
    # Summary to end
    builder.add_edge("summary", END)
    
    return builder
```

## Phase 6: Message Flow Control

### 6.1 Routing Logic

```python
def route_from_orchestrator(state: InvestigationState) -> str:
    """Determine next node based on state and messages."""
    
    current_phase = state.get("current_phase", "initialization")
    messages = state.get("messages", [])
    
    # Check for tool calls in last message
    if messages:
        last_message = messages[-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"  # Execute tools
    
    # Route based on phase
    if current_phase == "snowflake_analysis":
        if not state.get("snowflake_data"):
            return "tools"  # Force Snowflake execution
    
    elif current_phase == "domain_analysis":
        # Route to agents (parallel or sequential)
        if state.get("parallel_execution"):
            return ["network_agent", "device_agent", "location_agent", "logs_agent"]
        else:
            # Sequential - start with network
            if "network" not in state.get("domain_findings", {}):
                return "network_agent"
            elif "device" not in state.get("domain_findings", {}):
                return "device_agent"
            # ... continue sequence
    
    elif current_phase == "summary":
        return "summary"
    
    # Default back to orchestrator
    return "orchestrator"
```

### 6.2 State Update Management

```python
def update_state_with_tool_results(state: InvestigationState, tool_results: List[ToolMessage]) -> Dict:
    """Update state with tool execution results."""
    
    updates = {}
    
    for result in tool_results:
        tool_name = result.name
        
        # Special handling for Snowflake
        if "snowflake" in tool_name.lower():
            updates["snowflake_data"] = result.content
        
        # Track tools used
        tools_used = state.get("tools_used", [])
        if tool_name not in tools_used:
            tools_used.append(tool_name)
            updates["tools_used"] = tools_used
    
    return updates
```

## Phase 7: Implementation Steps

### Step 1: Create New Module
Create `/Users/gklainert/Documents/olorin/olorin-server/app/service/agent/orchestration/clean_graph_builder.py`

### Step 2: Implement State Schema
Define `InvestigationState` with all required fields

### Step 3: Build Orchestrator Agent
Implement orchestrator with proper phase management and tool selection

### Step 4: Create Domain Agents
Implement simplified domain agents that communicate through state

### Step 5: Tool Integration
Properly bind all 52 tools and create ToolNode

### Step 6: Graph Assembly
Connect all nodes with proper edges and routing

### Step 7: Testing
Start with mock data, then integrate real tools

## Phase 8: Key Improvements

### 8.1 Architecture Improvements
- **Single Tool Node**: Eliminates circular references
- **Central Orchestrator**: Clear control flow
- **State-Based Communication**: Clean message passing
- **Phase Management**: Structured investigation flow

### 8.2 Technical Improvements
- **Proper Message Sequencing**: tool_use → tool_result flow
- **Error Handling**: Graceful fallbacks
- **Performance**: Parallel execution where possible
- **Monitoring**: Clear phase tracking

### 8.3 Business Logic Improvements
- **Snowflake First**: Enforced 30-day analysis
- **Tool Usage Tracking**: Complete audit trail
- **Risk Scoring**: Consolidated from all sources
- **Comprehensive Coverage**: All 52 tools available

## Phase 9: Testing Strategy

### 9.1 Unit Tests
```python
# Test each node in isolation
async def test_orchestrator_agent():
    state = {"current_phase": "initialization", ...}
    result = await orchestrator_agent(state)
    assert result["current_phase"] == "snowflake_analysis"

async def test_network_agent():
    state = {"snowflake_data": {...}, ...}
    result = await network_agent(state)
    assert "network" in result["domain_findings"]
```

### 9.2 Integration Tests
```python
# Test full graph execution
async def test_full_investigation():
    graph = build_investigation_graph()
    result = await graph.ainvoke({
        "investigation_id": "test-123",
        "entity_id": "192.168.1.1",
        "entity_type": "ip_address"
    })
    assert result["current_phase"] == "complete"
    assert len(result["tools_used"]) > 10
```

### 9.3 Tool Tests
- Verify all 52 tools are accessible
- Test tool execution with mock data
- Validate tool result handling

### 9.4 Performance Tests
- Measure parallel vs sequential execution
- Benchmark tool execution times
- Test with high-load scenarios

## Phase 10: Migration Strategy

### 10.1 Parallel Implementation
1. Keep existing graph operational
2. Implement new graph alongside
3. Use feature flags for routing

### 10.2 Validation Phase
1. A/B test both implementations
2. Compare investigation scores
3. Monitor error rates

### 10.3 Rollout Plan
1. **Week 1**: Development and unit testing
2. **Week 2**: Integration testing
3. **Week 3**: Staging deployment
4. **Week 4**: Production rollout (10% traffic)
5. **Week 5**: Full migration

### 10.4 Rollback Plan
- Feature flag to instantly revert
- Keep old graph code for 30 days
- Monitor key metrics post-migration

## Success Metrics

### Technical Metrics
- **Tool Execution Success Rate**: > 95%
- **Investigation Completion Rate**: > 99%
- **Average Investigation Time**: < 30 seconds
- **Error Rate**: < 1%

### Business Metrics
- **Investigation Score**: > 85/100
- **Risk Detection Accuracy**: > 90%
- **Tool Utilization**: Average 15+ tools per investigation
- **Snowflake Usage**: 100% (mandatory)

## Risk Mitigation

### Technical Risks
- **Tool Failures**: Implement retry logic and fallbacks
- **Message Sequencing**: Strict validation of message flow
- **Performance**: Optimize parallel execution

### Operational Risks
- **Migration Issues**: Comprehensive rollback plan
- **Training**: Document new architecture thoroughly
- **Monitoring**: Enhanced logging and metrics

## Conclusion

This plan provides a complete blueprint for rebuilding the LangGraph investigation system with:
- ✅ All 52 tools properly integrated
- ✅ Central orchestrator managing flow
- ✅ All 5 domain agents included
- ✅ Snowflake-first investigation (30-day analysis)
- ✅ Clean message flow and state management
- ✅ No circular references or conflicts
- ✅ Comprehensive testing strategy
- ✅ Safe migration path

The new architecture will be more maintainable, reliable, and performant than the current implementation.

## Appendix: File Structure

```
app/service/agent/orchestration/
├── clean_graph_builder.py      # Main graph construction
├── orchestrator_agent.py       # Orchestrator implementation
├── state_schema.py            # State definitions
├── routing_logic.py           # Routing functions
├── domain_agents/
│   ├── network_agent.py
│   ├── device_agent.py
│   ├── location_agent.py
│   ├── logs_agent.py
│   └── risk_agent.py
└── tests/
    ├── test_orchestrator.py
    ├── test_agents.py
    └── test_full_graph.py
```