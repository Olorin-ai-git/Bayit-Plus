# Implementation Plan: Custom Investigation Log

**Branch**: `001-custom-investigation-log` | **Date**: 2025-01-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-custom-investigation-log/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a custom investigation logging system that creates dedicated log files for each investigation with `[{investigation_id}]` prefixed log entries. The system integrates with the existing unified logging infrastructure (`UnifiedLoggingCore`) to maintain consistency while providing investigation-specific log files in the investigation folder structure. All investigation-related logs (lifecycle events, agent execution, tool triggering) will be captured with DEBUG level logging by default and prefixed with the investigation ID for easy filtering and traceability.

**Technical Approach**: Extend `UnifiedLoggingCore` with investigation-specific log handlers and formatters. Use Python's `contextvars` for investigation context propagation across async operations. Create a custom log handler that writes to investigation-specific files while respecting unified logging configuration. Integrate with `InvestigationFolderManager` to ensure log files are created in the correct investigation folders.

## Technical Context

**Language/Version**: Python 3.11+  
**Primary Dependencies**: 
- `logging` (standard library)
- `contextvars` (standard library, for async context propagation)
- `UnifiedLoggingCore` (existing system)
- `InvestigationFolderManager` (existing system)
- `structlog` (existing dependency)
- `pythonjsonlogger` (existing dependency)

**Storage**: File system - log files stored in `logs/investigations/{MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/investigation.log`  
**Testing**: pytest with async support  
**Target Platform**: Linux server (Python FastAPI application)  
**Project Type**: Web application (backend server component)  
**Performance Goals**: 
- Log file creation: <100ms
- Log entry overhead: <10ms per entry
- Support 10+ concurrent investigations without performance degradation

**Constraints**: 
- Must integrate seamlessly with existing `UnifiedLoggingCore` without breaking changes
- Must support async/await patterns (investigations run asynchronously)
- Must handle concurrent investigations with thread-safe operations
- Must respect unified logging configuration (format, output destinations)
- Must maintain backward compatibility with existing logging systems

**Scale/Scope**: 
- Handle 10+ concurrent investigations
- Support investigation logs spanning multiple server restarts
- Manage log file sizes (rotation/archival may be needed for long-running investigations)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: ✅ PASSED

- **Integration with Existing Systems**: Extends `UnifiedLoggingCore` rather than creating duplicate logging infrastructure
- **Backward Compatibility**: Maintains compatibility with existing logging handlers and formatters
- **Performance**: Non-blocking async logging with minimal overhead
- **Maintainability**: Uses existing investigation folder structure and logging patterns
- **Testability**: Clear separation of concerns enables independent testing

## Project Structure

### Documentation (this feature)

```text
specs/001-custom-investigation-log/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
olorin-server/
├── app/
│   └── service/
│       └── logging/
│           ├── unified_logging_core.py          # Existing - extend with investigation support
│           ├── investigation_folder_manager.py  # Existing - used for folder structure
│           ├── investigation_log_handler.py    # NEW - custom handler for investigation logs
│           ├── investigation_log_context.py     # NEW - contextvars for investigation context
│           └── investigation_log_formatter.py   # NEW - formatter with [investigation_id] prefix
│
tests/
├── unit/
│   └── test_investigation_logging.py           # NEW - unit tests
└── integration/
    └── test_investigation_logging_integration.py  # NEW - integration tests
```

**Structure Decision**: Extend existing logging infrastructure in `olorin-server/app/service/logging/` with new investigation-specific components. Follow existing patterns and integrate with `UnifiedLoggingCore` and `InvestigationFolderManager`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - implementation extends existing systems without adding unnecessary complexity.

## Progress Tracking

### Phase 0: Research ✅
- [x] Analyze existing logging system architecture
- [x] Understand investigation folder structure
- [x] Research contextvars for async context propagation
- [x] Document integration points
- **Status**: COMPLETE - See `research.md`

### Phase 1: Design ✅
- [x] Design investigation log handler
- [x] Design investigation context system
- [x] Design log formatter with prefix
- [x] Define data models
- [x] Create API contracts
- [x] Write quickstart guide
- **Status**: COMPLETE - See `data-model.md`, `contracts/`, `quickstart.md`

### Phase 2: Task Breakdown
- [ ] Create implementation tasks
- **Status**: PENDING - Will be created by `/speckit.tasks` command
