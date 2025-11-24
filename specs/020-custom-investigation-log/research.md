# Phase 0: Research - Custom Investigation Log

## Research Objectives

1. Understand existing unified logging system architecture
2. Analyze investigation folder structure and management
3. Research async context propagation for investigation context
4. Identify integration points and potential conflicts
5. Document current logging patterns and formatters

## Existing Logging System Analysis

### UnifiedLoggingCore Architecture

**Location**: `olorin-server/app/service/logging/unified_logging_core.py`

**Key Components**:
- `UnifiedLoggingCore`: Singleton pattern for centralized logging management
- `LogFormat` enum: HUMAN, JSON, STRUCTURED
- `LogOutput` enum: CONSOLE, FILE, JSON_FILE, STRUCTURED_FILE
- Formatters: `ColoredFormatter`, `StructuredFormatter`
- Handlers: RotatingFileHandler, StreamHandler

**Current Capabilities**:
- Multiple format support (human-readable, JSON, structured)
- Multiple output destinations (console, files)
- Performance optimization (async logging, buffering)
- Configuration via YAML files
- Integration with existing specialized loggers

**Integration Points**:
- `get_logger(name)` method creates loggers
- `configure(config_dict)` method updates configuration
- Formatters can be customized per output
- Handlers are managed per output type

### Investigation Folder Structure

**Location**: `olorin-server/app/service/logging/investigation_folder_manager.py`

**Structure**:
```
logs/investigations/{MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/
├── investigation.log              # Main investigation log (target for this feature)
├── structured_activities.jsonl   # Agent activities log
├── journey_tracking.json          # Journey tracking data
├── metadata.json                  # Investigation metadata
├── server_logs                    # Server logs during investigation
└── results/                       # Investigation results directory
```

**Key Methods**:
- `create_investigation_folder()`: Creates folder with metadata
- `get_investigation_folder()`: Retrieves folder path by investigation_id
- `get_log_file_paths()`: Returns dictionary of log file paths

**Current Log Files**:
- `investigation.log` exists but may not be used consistently
- `structured_activities.jsonl` used by `StructuredInvestigationLogger`
- `server_logs` directory used by `InvestigationLogHandler`

### Existing Investigation Logging Components

#### 1. InvestigationLogHandler
**Location**: `olorin-server/app/service/logging/server_log_capture.py`

**Current Implementation**:
- Custom `logging.Handler` subclass
- Captures logs to a queue
- Includes investigation_id in extra_data
- Used by `LogCaptureSession` for capturing server logs

**Limitations**:
- Does not write directly to investigation log file
- Does not prefix log entries with `[investigation_id]`
- Queue-based approach may lose logs if queue is full

#### 2. StructuredInvestigationLogger
**Location**: `olorin-server/app/service/logging/autonomous_investigation_logger.py`

**Current Implementation**:
- Creates structured logs in `structured_investigations.jsonl`
- Logs LLM interactions, tool executions, agent decisions
- Uses custom JSON formatter
- Separate from main investigation log

**Integration Opportunity**:
- Can be extended to also write to `investigation.log`
- Already has investigation_id context

#### 3. InvestigationLogWriter
**Location**: `olorin-server/app/service/logging/investigation_log_writer.py`

**Current Implementation**:
- Writes investigation logs to files
- JSON format entries
- Separate from unified logging system
- Used by `InvestigationInstrumentationLogger`

**Limitations**:
- Not integrated with unified logging
- Does not use investigation folder structure consistently
- Does not prefix logs with investigation_id

## Investigation Initialization Flow

### Frontend to Backend Flow

1. **Frontend** (`investigationService.ts`):
   - Creates investigation via `/api/v1/investigation-state/`
   - Sends `InvestigationParams` with:
     - `id`: investigation_id
     - `entityId`, `entityType`
     - `timeRange`, `tools`
     - `investigationType`, `investigationMode`
     - `metadata`

2. **Backend** (`investigation_controller.py`):
   - Receives `StructuredInvestigationRequest`
   - Extracts investigation_id
   - Creates investigation context
   - Calls `structured_investigation_logger.start_investigation_logging()`

3. **Investigation Execution**:
   - `start_investigation()` in `investigation_coordinator.py`
   - Extracts metadata from agent_context or state
   - Creates investigation record
   - Passes investigation_id through state

### Metadata Structure

**From Frontend**:
```typescript
{
  id: string,                    // investigation_id
  entityId: string,
  entityType: string,
  timeRange?: {...},
  tools?: Array<{...}>,
  investigationType?: 'structured' | 'hybrid-graph',
  investigationMode?: 'entity' | 'risk',
  metadata?: Record<string, any>
}
```

**Backend Context**:
```python
{
  "investigation_id": str,
  "entity_id": str,
  "entity_type": str,
  "trigger_event": {...},
  "investigation_data": {...},
  "metadata": {...},
  "time_range": {...}
}
```

## Async Context Propagation Research

### Python contextvars Module

**Purpose**: Store context variables that are automatically propagated across async operations and threads.

**Key Classes**:
- `contextvars.ContextVar`: Context variable
- `contextvars.copy_context()`: Copy current context
- `contextvars.Context`: Context object

**Usage Pattern**:
```python
import contextvars

investigation_id_var = contextvars.ContextVar('investigation_id')

# Set context
investigation_id_var.set('inv-123')

# Get context (works across async boundaries)
investigation_id = investigation_id_var.get(None)
```

**Benefits**:
- Automatic propagation in async/await chains
- Thread-safe
- No need to pass investigation_id through every function call
- Works with LangGraph state management

**Integration Points**:
- Set investigation_id when investigation starts
- Retrieve in log handlers/formatters
- Clear when investigation completes

## Log Formatting Research

### Current Format Patterns

**Human Format**:
```
2025-01-11 12:00:00 [INFO] logger_name: message
```

**JSON Format**:
```json
{"timestamp": "2025-01-11T12:00:00", "level": "INFO", "logger": "logger_name", "message": "message"}
```

**Structured Format**:
```json
{"timestamp": "2025-01-11T12:00:00", "level": "INFO", "logger": "logger_name", "message": "message", "module": "...", "function": "...", "line": 123}
```

### Required Format with Prefix

**Target Format**:
```
[inv-123] 2025-01-11 12:00:00 [INFO] logger_name: message
```

**JSON Format with Prefix**:
```json
{"investigation_id": "inv-123", "timestamp": "2025-01-11T12:00:00", "level": "INFO", "logger": "logger_name", "message": "message"}
```

**Implementation Approach**:
- Custom formatter that checks contextvars for investigation_id
- Adds prefix to formatted message
- Includes investigation_id in structured fields

## Integration Challenges and Solutions

### Challenge 1: Multiple Logging Systems
**Problem**: Multiple investigation logging systems exist (InvestigationLogHandler, StructuredInvestigationLogger, InvestigationLogWriter)

**Solution**: Create unified investigation log handler that integrates with UnifiedLoggingCore and writes to investigation.log

### Challenge 2: Async Context Propagation
**Problem**: Investigation_id needs to be available across async boundaries

**Solution**: Use contextvars to store investigation_id, set at investigation start, retrieve in log handlers

### Challenge 3: Format Consistency
**Problem**: Investigation logs must respect unified logging format while adding prefix

**Solution**: Extend existing formatters to check for investigation context and add prefix

### Challenge 4: Concurrent Investigations
**Problem**: Multiple investigations running simultaneously need separate log files

**Solution**: Use investigation_id from contextvars to route logs to correct file

### Challenge 5: Performance
**Problem**: Logging should not block investigation execution

**Solution**: Use async logging handlers, non-blocking file writes, buffering

## Key Design Decisions

1. **Extend UnifiedLoggingCore**: Rather than create new system, extend existing one
2. **Use contextvars**: For investigation_id propagation across async boundaries
3. **Custom Handler**: Create `InvestigationLogHandler` that writes to investigation.log
4. **Custom Formatter**: Extend existing formatters to add `[investigation_id]` prefix
5. **Investigation Folder Integration**: Use `InvestigationFolderManager` for file paths
6. **DEBUG Level Default**: Set investigation log level to DEBUG as specified
7. **Dual Output**: Write to both investigation.log and unified logging outputs

## Open Questions

1. **Log Rotation**: Should investigation.log files be rotated? (Answer: Yes, for long-running investigations)
2. **Log Retention**: How long should investigation logs be retained? (Answer: Follow investigation folder retention policy)
3. **Error Handling**: What happens if log file write fails? (Answer: Fall back to unified logging, log error)
4. **Performance Monitoring**: Should we track logging performance metrics? (Answer: Yes, for success criteria SC-007)

## Next Steps

1. Design investigation log handler architecture
2. Design investigation context system using contextvars
3. Design log formatter with prefix support
4. Define data models and contracts
5. Create quickstart guide

