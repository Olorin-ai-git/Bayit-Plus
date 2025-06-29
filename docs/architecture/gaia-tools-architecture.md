# OLORIN-Tools Architecture Documentation

## Project Overview
**OLORIN-Tools** is a shared library providing reusable investigation tools and adapters for the OLORIN ecosystem. It implements a plugin-based architecture with standardized tool interfaces for seamless integration across different contexts.

## High-Level Architecture

### Tool Library Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                      OLORIN-Tools Library                        │
├─────────────────────────────────────────────────────────────────┤
│  Tool Interface Layer                                          │
│  ├── Base Tool Interface                                       │
│  ├── Enhanced Base Classes                                     │
│  ├── Tool Metadata Management                                  │
│  └── Execution Context Handling                                │
├─────────────────────────────────────────────────────────────────┤
│  Adapter Framework                                              │
│  ├── LangChain Adapter                                         │
│  ├── MCP (Model Context Protocol) Adapter                      │
│  ├── Direct API Adapter                                        │
│  └── Custom Adapter Registry                                   │
├─────────────────────────────────────────────────────────────────┤
│  Tool Implementations                                           │
│  ├── Splunk Investigation Tools                                │
│  ├── Identity & Location Tools                                 │
│  ├── Vector Search Tools                                       │
│  └── Custom Investigation Tools                                │
├─────────────────────────────────────────────────────────────────┤
│  Integration Points                                             │
│  ├── OLORIN Main Service                                         │
│  ├── OLORIN-MCP Service                                         │
│  ├── LangChain Framework                                       │
│  └── External Services                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Core Architecture Components

### Base Tool Interface
- **Abstract Base**: Standardized tool interface for all implementations
- **Metadata System**: Tool discovery and capability description
- **Execution Framework**: Async execution with result handling
- **Error Management**: Comprehensive error handling and reporting

### Key Modules
1. **`olorintools/base/`**: Core interfaces and base classes
2. **`olorintools/adapters/`**: Framework adapters (LangChain, MCP)
3. **`olorintools/implementations/`**: Concrete tool implementations
4. **`olorintools/utils/`**: Shared utilities and helpers
5. **`olorintools/config/`**: Configuration management

## Tool Interface Design

### Enhanced Base Tool
```python
class EnhancedBaseTool:
    - Tool metadata and description
    - Async execution framework
    - Input validation and sanitization
    - Output formatting and standardization
    - Error handling and recovery
    - Performance monitoring
```

### Tool Lifecycle
```
Tool Discovery → Initialization → Validation → Execution → Result Processing
├── Metadata retrieval
├── Configuration loading
├── Input validation
├── Async execution
└── Result formatting
```

## Adapter Framework

### LangChain Adapter
- **Integration**: Seamless LangChain tool conversion
- **Chain Support**: Tool chaining and composition
- **Memory Management**: Context preservation across calls
- **Streaming**: Real-time result streaming

### MCP Adapter
- **Protocol Compliance**: Full MCP specification support
- **Tool Registration**: Dynamic tool discovery
- **Execution Delegation**: Async tool execution
- **Result Marshaling**: Protocol-compliant response formatting

### Direct API Adapter
- **REST API**: Direct HTTP API integration
- **Authentication**: Token-based and certificate authentication
- **Rate Limiting**: Built-in rate limiting and retry logic
- **Response Caching**: Intelligent response caching

## Tool Implementations

### Splunk Investigation Tools
- **Query Execution**: SPL query processing and results
- **Dashboard Integration**: Splunk dashboard and visualization
- **Alert Management**: Alert creation and monitoring
- **Data Export**: Result export and formatting

### Identity & Location Services
- **OII Integration**: Identity verification and lookup
- **Location Analysis**: Geographic analysis and risk assessment
- **Device Fingerprinting**: Device identification and tracking
- **Risk Scoring**: Multi-factor risk calculation

### Vector Search Tools
- **Semantic Search**: Vector-based similarity search
- **Document Retrieval**: Knowledge base search and retrieval
- **Embedding Generation**: Text and document embedding
- **Similarity Analysis**: Content similarity and clustering

## Configuration Management

### Tool Configuration
```yaml
tool_config:
  name: "splunk_investigation"
  version: "1.0.0"
  dependencies:
    - splunk-sdk
    - requests
  authentication:
    type: "token"
    required: true
  parameters:
    max_results: 1000
    timeout: 30s
```

### Environment Support
- **Development**: Local configuration with mock services
- **Testing**: Isolated test environment with fixtures
- **Production**: Enterprise configuration with security

## Performance Architecture

### Execution Optimization
- **Async Processing**: Non-blocking tool execution
- **Connection Pooling**: Efficient resource utilization
- **Result Caching**: Intelligent caching strategies
- **Batch Operations**: Multi-request optimization

### Resource Management
- **Memory Efficient**: Streaming and pagination support
- **Connection Limits**: Configurable connection pools
- **Timeout Handling**: Graceful timeout and retry logic
- **Resource Cleanup**: Automatic resource disposal

## Testing Framework

### Test Architecture
- **Unit Tests**: Individual tool testing with mocks
- **Integration Tests**: End-to-end tool execution
- **Performance Tests**: Load and stress testing
- **Compatibility Tests**: Cross-adapter validation

### Test Coverage
- **Tool Interface**: Base class and method testing
- **Adapter Framework**: All adapter implementations
- **Tool Implementations**: Complete tool functionality
- **Error Scenarios**: Comprehensive error handling

## Security Architecture

### Input Validation
- **Parameter Sanitization**: Input cleaning and validation
- **Injection Prevention**: SQL and command injection protection
- **Size Limits**: Request and response size controls
- **Type Checking**: Strict type validation

### Authentication & Authorization
- **Token Management**: Secure token handling and rotation
- **Permission Checks**: Tool-level access control
- **Audit Logging**: Comprehensive execution logging
- **Encryption**: Data encryption in transit and at rest

## Deployment & Distribution

### Package Management
- **PyPI Distribution**: Standard Python package distribution
- **Version Management**: Semantic versioning with compatibility
- **Dependency Management**: Poetry-based dependency resolution
- **Build Automation**: Automated testing and publishing

### Integration Patterns
- **Library Import**: Direct Python import and usage
- **Service Integration**: REST API and RPC integration
- **Container Deployment**: Docker-based tool execution
- **Serverless**: Lambda and cloud function support

## Technology Stack

### Core Technologies
- **Python 3.11+**: Runtime environment
- **Pydantic**: Data validation and serialization
- **httpx**: Async HTTP client
- **Poetry**: Dependency management

### External Integrations
- **LangChain**: Agent framework integration
- **MCP Protocol**: Model Context Protocol support
- **Splunk SDK**: Native Splunk integration
- **Vector Databases**: Multiple vector DB support

## Future Enhancements

### Tool Ecosystem Expansion
- **Plugin Marketplace**: Community tool sharing
- **Tool Templates**: Standardized tool development
- **Custom Tool SDK**: Developer toolkit
- **Tool Versioning**: Backward compatibility framework

### Advanced Features
- **Workflow Engine**: Multi-tool workflow orchestration
- **Real-time Processing**: Stream processing capabilities
- **AI/ML Integration**: Enhanced AI tool support
- **Multi-tenancy**: Enterprise tenant isolation

---

**Document Version**: 1.0  
**Last Updated**: January 28, 2025  
**Architecture Owner**: OLORIN-Tools Development Team  
**Library Version**: 1.0.0
