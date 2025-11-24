# Structured Agents Refactoring Plan

**Author**: Gil Klainert  
**Date**: 2024-08-30  
**Objective**: Refactor `app/service/agent/structured_agents.py` (943 lines) to comply with 200-line rule  
**Diagram**: [Link to Mermaid diagram](/docs/diagrams/structured-agents-refactoring-architecture.mermaid)

## Analysis of Current File Structure

The current `structured_agents.py` file contains:
- **Lines 45-375**: `StructuredInvestigationAgent` base class (330 lines)
- **Lines 378-501**: `structured_network_agent` function (123 lines)  
- **Lines 504-627**: `structured_device_agent` function (123 lines)
- **Lines 630-753**: `structured_location_agent` function (123 lines)
- **Lines 756-879**: `structured_logs_agent` function (123 lines)
- **Lines 882-942**: Helper functions and context management (60 lines)

## Refactoring Strategy

### 1. **Base Agent Classes** (`base_agents.py` - ~180 lines)
- Core `StructuredInvestigationAgent` class
- Abstract base methods and interfaces
- Common LLM configuration and initialization
- Basic investigation workflow

### 2. **Agent Domain Implementations** (`domain_agents.py` - ~190 lines)  
- Concrete domain-specific structured agent functions:
  - `structured_network_agent`
  - `structured_device_agent` 
  - `structured_location_agent`
  - `structured_logs_agent`

### 3. **Agent Communication & Context** (`agent_communication.py` - ~120 lines)
- Helper functions for context extraction
- State management utilities
- WebSocket progress broadcasting
- Journey tracking integration

### 4. **Agent Factories & Configuration** (`agent_factory.py` - ~90 lines)
- Agent creation and tool binding
- Configuration management
- Error handling for agent initialization
- Domain-specific objective configuration

## Detailed Implementation Plan

### Phase 1: Create Base Agent Classes Module

**File**: `app/service/agent/base_agents.py`

**Contents**:
- Import statements and configuration
- `StructuredInvestigationAgent` class (core functionality)
- Base investigation methods
- LLM result parsing logic
- Common utilities

**Key Methods**:
- `__init__()` - Agent initialization with tool binding
- `structured_investigate()` - Core investigation workflow  
- `_create_investigation_prompt()` - Prompt generation
- `_parse_structured_result()` - Result parsing
- `_extract_findings_from_content()` - Content extraction

### Phase 2: Create Domain Agents Module

**File**: `app/service/agent/domain_agents.py`

**Contents**:
- All domain-specific agent functions
- Specialized investigation logic for each domain
- Domain-specific WebSocket progress updates
- Journey tracking for domain operations

**Functions**:
- `structured_network_agent()`
- `structured_device_agent()`
- `structured_location_agent()`
- `structured_logs_agent()`

### Phase 3: Create Agent Communication Module

**File**: `app/service/agent/agent_communication.py`

**Contents**:
- Context extraction utilities
- State management helpers
- Progress broadcasting functions
- Error response creation

**Functions**:
- `_extract_investigation_info()`
- `_create_error_response()`
- `_get_or_create_structured_context()`
- `_broadcast_agent_progress()`

### Phase 4: Create Agent Factory Module

**File**: `app/service/agent/agent_factory.py`

**Contents**:
- Agent creation patterns
- Tool configuration and binding
- Default domain objectives
- Agent initialization helpers

**Functions**:
- `create_structured_agent()`
- `configure_domain_tools()`
- `get_domain_objectives()`
- `initialize_llm_with_tools()`

## File Structure After Refactoring

```
app/service/agent/
├── structured_agents.py (REFACTORED - imports only, ~20 lines)
├── base_agents.py (~180 lines)
├── domain_agents.py (~190 lines) 
├── agent_communication.py (~120 lines)
├── agent_factory.py (~90 lines)
└── __init__.py (updated exports)
```

## Backward Compatibility

- All existing imports will continue to work through `structured_agents.py`
- Public API remains unchanged
- Internal refactoring only - no external interface changes
- Preserve all existing functionality and behavior

## Quality Assurance

- Maintain all structured agent functionality
- Preserve existing imports and interfaces  
- Each module under 200 lines
- Comprehensive error handling
- Proper logging and monitoring
- Full test coverage preservation

## Implementation Steps

1. **Create base_agents.py** with core `StructuredInvestigationAgent` class
2. **Create domain_agents.py** with all domain-specific agent functions
3. **Create agent_communication.py** with helper utilities
4. **Create agent_factory.py** with creation and configuration logic  
5. **Refactor structured_agents.py** to import and re-export from new modules
6. **Update __init__.py** with proper exports
7. **Run comprehensive tests** to verify functionality
8. **Code review** with code-reviewer subagent

## Success Criteria

- ✅ All files under 200 lines
- ✅ All existing functionality preserved
- ✅ No breaking changes to public API
- ✅ All tests pass
- ✅ Proper module separation and organization
- ✅ Code quality maintained or improved

## Risk Mitigation

- **Import Issues**: Careful re-export strategy in main file
- **Circular Dependencies**: Clear separation of concerns across modules
- **Functionality Loss**: Comprehensive testing at each step
- **Integration Issues**: Preserve all existing interfaces and behavior