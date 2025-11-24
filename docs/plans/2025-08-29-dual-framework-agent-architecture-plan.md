# Dual-Framework Agent Architecture Plan

**Author:** Gil Klainert  
**Date:** 2025-08-29  
**Status:** Planning Phase  
**Link to Mermaid Diagram:** [Architecture Diagram](/docs/diagrams/2025-08-29-dual-framework-agent-architecture.mmd)

## Executive Summary

Design and implement a dual-framework architecture for the Olorin fraud detection platform that supports both LangGraph and OpenAI Agents frameworks with seamless switching capabilities, maintaining existing functionality while providing feature parity and improved performance options.

## Current State Analysis

### LangGraph Implementation (Current)
- **Structured Investigation System**: Complex multi-agent orchestration with structured decision-making
- **Agent Types**: Device, Network, Location, Logs, Risk Assessment, and Anomaly Detection agents
- **Execution Patterns**: Parallel and sequential agent graph execution
- **WebSocket Integration**: Real-time streaming updates during investigations
- **Tool System**: Rich tool binding with LLM-driven tool selection
- **Context Management**: Sophisticated investigation context and findings structure
- **Performance**: Robust but potentially heavy for simple use cases

### OpenAI Agents Integration (Target)
- **Lightweight SDK**: Simple Agent primitive with instructions and tools
- **Handoff System**: Built-in agent-to-agent handoff capabilities
- **Agent Loop**: Automated conversation handling with tool calling
- **Python Integration**: Automatic function tool generation from Python functions
- **Session Management**: Built-in conversation history and state management
- **Validation**: Input/output guardrails and validation systems

## Architecture Design Goals

### Primary Objectives
1. **Dual Framework Support**: Enable both LangGraph and OpenAI Agents frameworks to coexist
2. **Configuration-Based Switching**: Runtime framework selection via environment variables/feature flags
3. **Feature Parity**: Maintain identical capabilities across both frameworks
4. **Zero Breaking Changes**: Preserve all existing API contracts and functionality
5. **Performance Optimization**: Provide lightweight option for simple investigations
6. **Seamless Migration**: Enable gradual migration between frameworks

### Technical Requirements
- **Framework Abstraction**: Clean separation between framework-specific implementations
- **Unified Interface**: Single API contract for both frameworks
- **Tool Compatibility**: Shared tool system works with both frameworks
- **Context Preservation**: Maintain investigation context structure
- **WebSocket Support**: Real-time updates for both frameworks
- **Testing Strategy**: Comprehensive validation for both implementations

## Detailed Architecture Design

### 1. Framework Abstraction Layer

#### Core Interface Design
```python
class AgentFramework(ABC):
    """Abstract base class for agent frameworks"""
    
    @abstractmethod
    async def create_agent(self, agent_type: str, config: AgentConfig) -> BaseAgent
    
    @abstractmethod
    async def execute_investigation(self, request: InvestigationRequest) -> InvestigationResult
    
    @abstractmethod
    async def stream_investigation(self, request: InvestigationRequest) -> AsyncIterator[InvestigationUpdate]
    
    @abstractmethod
    def get_supported_patterns(self) -> List[str]
```

#### Framework Implementations
- **LangGraphFramework**: Wraps existing LangGraph implementation
- **OpenAIAgentsFramework**: New implementation using OpenAI Agents SDK
- **FrameworkRegistry**: Factory for framework instances with configuration-based selection

### 2. Configuration Management System

#### Framework Selection Strategy
```python
class FrameworkConfig:
    """Configuration for framework selection and settings"""
    
    # Framework Selection
    default_framework: Literal["langgraph", "openai_agents"] = "langgraph"
    framework_override: Dict[str, str] = {}  # Agent-specific overrides
    
    # Feature Flags
    enable_parallel_execution: bool = True
    enable_structured_mode: bool = True
    enable_tool_validation: bool = True
    
    # Performance Settings
    max_concurrent_agents: int = 5
    investigation_timeout: int = 300
    streaming_batch_size: int = 10
```

#### Environment-Based Configuration
- `OLORIN_AGENT_FRAMEWORK`: Default framework selection
- `OLORIN_AGENT_PARALLEL_MODE`: Enable/disable parallel execution
- `OLORIN_AGENT_AUTONOMOUS_MODE`: Enable/disable structured investigations
- Agent-specific overrides via configuration files

### 3. Unified Agent Interface and Factory

#### Agent Interface Abstraction
```python
class BaseAgent(ABC):
    """Unified interface for all agent types across frameworks"""
    
    @abstractmethod
    async def investigate(self, context: InvestigationContext) -> AgentResult
    
    @abstractmethod
    async def stream_investigate(self, context: InvestigationContext) -> AsyncIterator[AgentUpdate]
    
    @abstractmethod
    def get_capabilities(self) -> List[str]
    
    @abstractmethod
    def validate_input(self, context: InvestigationContext) -> bool
```

#### Framework-Aware Factory
```python
class AgentFactory:
    """Factory for creating agents with framework-aware logic"""
    
    def __init__(self, framework_registry: FrameworkRegistry):
        self.framework_registry = framework_registry
    
    async def create_agent(self, agent_type: str, framework: str = None) -> BaseAgent:
        # Framework selection logic
        # Agent creation with proper framework binding
        # Tool injection and configuration
        
    def get_available_agents(self, framework: str) -> List[str]:
        # Return available agents for specific framework
```

### 4. Tool Compatibility Layer

#### Universal Tool Interface
```python
class UniversalTool(ABC):
    """Tool interface that works with both frameworks"""
    
    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult
    
    @abstractmethod
    def get_schema(self) -> Dict[str, Any]
    
    @abstractmethod
    def validate_input(self, **kwargs) -> bool
    
    # Framework-specific bindings
    def to_langgraph_tool(self) -> LangGraphTool
    def to_openai_tool(self) -> OpenAITool
```

#### Tool Adapter System
```python
class ToolAdapter:
    """Adapts tools between framework formats"""
    
    @staticmethod
    def adapt_for_langgraph(tool: UniversalTool) -> LangGraphTool
    
    @staticmethod
    def adapt_for_openai(tool: UniversalTool) -> OpenAITool
    
    @staticmethod
    def create_universal_tool(implementation: Callable) -> UniversalTool
```

### 5. Investigation Context Management

#### Unified Context Structure
```python
class InvestigationContext:
    """Unified context structure for both frameworks"""
    
    # Core Investigation Data
    investigation_id: str
    user_id: str
    request_data: Dict[str, Any]
    
    # Framework-Agnostic State
    findings: List[Finding]
    agent_results: Dict[str, AgentResult]
    risk_score: float
    
    # Framework-Specific State
    langgraph_state: Optional[Dict[str, Any]] = None
    openai_session: Optional[Dict[str, Any]] = None
    
    # Shared Utilities
    def add_finding(self, agent_type: str, finding: Finding)
    def get_agent_results(self, agent_type: str) -> Optional[AgentResult]
    def update_risk_score(self, new_score: float)
```

#### Context Persistence
- **Database Schema**: Framework-agnostic investigation state storage
- **State Serialization**: JSON-serializable context for both frameworks
- **Migration Support**: Convert context between framework formats

### 6. WebSocket Integration Strategy

#### Streaming Interface
```python
class InvestigationStreamer:
    """Framework-agnostic streaming for real-time updates"""
    
    async def stream_investigation(
        self, 
        context: InvestigationContext, 
        framework: AgentFramework
    ) -> AsyncIterator[InvestigationUpdate]:
        # Framework-specific streaming logic
        # Unified update format
        # Error handling and recovery
```

#### Update Format Standardization
```python
class InvestigationUpdate:
    """Standardized update format for WebSocket streaming"""
    
    update_type: UpdateType  # AGENT_START, AGENT_PROGRESS, AGENT_COMPLETE, ERROR
    agent_type: str
    timestamp: datetime
    data: Dict[str, Any]
    progress: float
    metadata: Dict[str, Any]
```

### 7. Testing and Validation Approach

#### Comprehensive Test Strategy
1. **Unit Tests**: Framework-specific and unified interface tests
2. **Integration Tests**: Full investigation workflows for both frameworks
3. **Performance Tests**: Framework performance comparison and benchmarking
4. **Migration Tests**: Context and state migration between frameworks
5. **Stress Tests**: Concurrent investigation handling

#### Validation Framework
```python
class FrameworkValidator:
    """Validates feature parity between frameworks"""
    
    async def validate_agent_behavior(self, agent_type: str) -> ValidationResult
    async def validate_tool_compatibility(self, tool_name: str) -> ValidationResult
    async def validate_investigation_results(self, test_case: TestCase) -> ValidationResult
```

### 8. Migration and Rollback Strategies

#### Gradual Migration Path
1. **Phase 1**: Implement abstraction layer with LangGraph as default
2. **Phase 2**: Add OpenAI Agents implementation with feature flags
3. **Phase 3**: Enable per-agent framework selection
4. **Phase 4**: Performance testing and optimization
5. **Phase 5**: Production rollout with monitoring

#### Rollback Mechanisms
- **Configuration Rollback**: Instant framework switching via environment variables
- **State Migration**: Convert in-flight investigations between frameworks
- **Monitoring Integration**: Automated rollback on performance degradation
- **A/B Testing**: Gradual traffic migration with performance comparison

## Implementation Priority

### High Priority (Phase 1-2)
1. Framework abstraction layer implementation
2. Configuration management system
3. LangGraph adapter implementation
4. Basic OpenAI Agents implementation
5. Tool compatibility layer

### Medium Priority (Phase 3-4)
1. WebSocket streaming integration
2. Advanced context management
3. Performance optimization
4. Comprehensive testing suite
5. Migration utilities

### Lower Priority (Phase 5)
1. Advanced monitoring integration
2. A/B testing framework
3. Performance analytics
4. Documentation and training materials
5. Advanced rollback mechanisms

## Success Metrics

### Technical Metrics
- **Performance**: Response time comparison between frameworks
- **Reliability**: Error rate and uptime metrics
- **Compatibility**: Tool and agent feature parity validation
- **Scalability**: Concurrent investigation handling capacity

### Business Metrics
- **Investigation Accuracy**: Fraud detection accuracy comparison
- **Operational Efficiency**: Investigation completion time
- **Resource Utilization**: CPU, memory, and cost optimization
- **Developer Productivity**: Implementation and maintenance effort

## Risk Assessment

### Technical Risks
- **Complexity Overhead**: Abstraction layer complexity and maintenance burden
- **Performance Impact**: Abstraction layer performance overhead
- **Framework Compatibility**: OpenAI Agents feature limitations vs LangGraph
- **State Management**: Complex state synchronization between frameworks

### Mitigation Strategies
- **Incremental Implementation**: Phased rollout with extensive testing
- **Performance Monitoring**: Continuous performance benchmark comparison
- **Feature Validation**: Comprehensive parity testing between frameworks
- **Rollback Planning**: Quick rollback mechanisms for production issues

## Conclusion

This dual-framework architecture provides a robust, flexible foundation for supporting both LangGraph and OpenAI Agents frameworks while maintaining existing functionality and enabling future framework adoption. The design emphasizes clean separation of concerns, comprehensive testing, and safe migration strategies to ensure production stability during the transition.