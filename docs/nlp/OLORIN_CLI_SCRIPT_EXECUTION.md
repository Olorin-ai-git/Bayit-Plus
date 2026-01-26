# Olorin CLI Script Execution Enhancement

## Overview

Enhanced the Olorin CLI NLP agent system to execute bash and Python scripts directly, enabling automated content management operations.

## Changes Made

### 1. Created Bash Wrapper Script

**File**: `scripts/bayit-organize-series.sh`

- Wrapper script for the organize_series.py Python script
- Supports `--dry-run` and `--limit` flags
- Includes prerequisite checking (Poetry, backend directory, script existence)
- Provides colored output and clear error messages

### 2. Added Script Execution Tools

#### execute_bash_script (Base CLI Tool)

Generic tool for executing any bash script from the scripts directory:

```json
{
  "name": "execute_bash_script",
  "description": "Execute a bash script from the scripts directory",
  "properties": {
    "script_path": "Path to bash script (relative or absolute)",
    "args": "Command-line arguments array",
    "dry_run": "Preview without executing"
  }
}
```

**Security Features**:
- Path validation (must be within project directory)
- Only `.sh` files allowed
- Automatic chmod +x before execution
- 5-minute timeout
- Captures stdout and stderr separately

#### organize_series (Bayit+ Platform Tool)

Dedicated tool for series organization:

```json
{
  "name": "organize_series",
  "description": "Organize all series in the database",
  "properties": {
    "dry_run": "Preview changes without making them",
    "limit": "Limit processing to N series"
  }
}
```

### 3. Added 15+ Content Management Tools

All Bayit+ platform-specific tools added to `tool_registry.py`:

| Tool | Description | Destructive |
|------|-------------|-------------|
| `organize_series` | Organize series with TMDB metadata | ✓ |
| `attach_posters` | Find and attach missing posters | ✓ |
| `attach_podcast_radio_posters` | Attach posters to podcasts/radio | ✓ |
| `add_subtitles` | Add subtitles to content | ✓ |
| `sync_podcasts` | Sync podcast episodes from RSS | ✓ |
| `translate_podcast` | Translate podcast to languages | ✓ |
| `update_podcast_covers` | Update podcast cover images | ✓ |
| `check_series_integrity` | Verify series structure | - |
| `verify_library_integrity` | Run full library verification | - |
| `cleanup_titles` | Clean and normalize titles | ✓ |
| `localize_content` | Add translations to metadata | ✓ |
| `backup_database` | Create MongoDB backup | ✓ |
| `restore_database` | Restore from backup | ✓ |
| `find_duplicates` | Find duplicate content | - |
| `upload_series` | Upload series from USB/local | ✓ |
| `upload_movies` | Upload movies from USB/local | ✓ |

### 4. Updated DESTRUCTIVE_TOOLS Set

All data-modifying tools marked as destructive and require confirmation in "smart" action mode:

```python
DESTRUCTIVE_TOOLS: Set[str] = {
    "deploy_platform",
    "git_push",
    "git_commit",
    "delete_content",
    "delete_user",
    "update_content_metadata",
    "upload_content",
    "run_content_audit",
    "execute_bash_script",  # NEW
    "organize_series",  # NEW
    "attach_posters",  # NEW
    # ... 10+ more new tools
}
```

### 5. Implemented Tool Handlers

Added handlers in `tool_dispatcher.py` for all new tools:

- Script path resolution
- Command building with proper arguments
- Subprocess execution with timeouts
- Output capture and formatting
- Error handling

**Fully Implemented**:
- execute_bash_script
- organize_series
- attach_posters
- attach_podcast_radio_posters
- add_subtitles
- sync_podcasts
- translate_podcast
- update_podcast_covers
- check_series_integrity
- verify_library_integrity
- cleanup_titles

**Placeholder** (ready for script creation):
- localize_content
- backup_database
- restore_database
- find_duplicates
- upload_series
- upload_movies

## Usage Examples

### Via Olorin CLI (Command Line)

```bash
# Start interactive session
olorin

# In the Olorin CLI:
olorin> run series organization script
olorin> organize series in dry run mode
olorin> attach missing posters to all content
olorin> sync podcasts from RSS feeds
olorin> add subtitles to series with Hebrew audio
```

### Via API (Direct HTTP)

```bash
# Execute agent with natural language
curl -X POST http://localhost:8090/api/v1/nlp/execute-agent \
  -H "Content-Type: application/json" \
  -d '{
    "query": "organize series in dry run mode with limit 10",
    "platform": "bayit",
    "action_mode": "smart"
  }'

# The agent will:
# 1. Understand the intent
# 2. Call the organize_series tool
# 3. Request confirmation (smart mode)
# 4. Execute after user confirms
```

### Action Modes

**Smart Mode** (default):
- Read operations execute immediately
- Write operations execute immediately
- Destructive operations require confirmation

**Confirm All Mode**:
- Read operations execute immediately
- All write/destructive operations require confirmation

## Testing

Test the organize_series tool with dry run:

```bash
# Test via API
curl -s -X POST http://localhost:8090/api/v1/nlp/execute-agent \
  -H "Content-Type: application/json" \
  -d '{
    "query": "organize series in dry run mode",
    "platform": "bayit",
    "dry_run": false,
    "action_mode": "smart"
  }' | python3 -m json.tool
```

Expected response:
```json
{
  "success": true,
  "tool_calls": [
    {
      "tool": "organize_series",
      "output": "[PENDING CONFIRMATION]"
    }
  ],
  "pending_confirmations": [
    {
      "action_id": "organize_series_...",
      "action_type": "organize_series",
      "description": "Execute organize_series with parameters"
    }
  ]
}
```

## Security Considerations

1. **Path Validation**: Scripts must be within project directory
2. **File Type Restriction**: Only `.sh` files allowed
3. **Timeout Protection**: 5-10 minute timeouts prevent runaway processes
4. **Confirmation Required**: All destructive operations require user approval
5. **Context Hashing**: Actions validated against execution context to prevent stale executions

## File Structure

```
bayit-plus/
├── backend/
│   └── app/
│       └── services/
│           └── nlp/
│               ├── tool_registry.py (UPDATED - 15+ new tools)
│               └── tool_dispatcher.py (UPDATED - handlers)
├── scripts/
│   ├── bayit-organize-series.sh (NEW)
│   ├── organize_series.py (EXISTING)
│   └── backend/
│       ├── bayit-attach-posters.sh
│       ├── bayit-sync-podcasts.sh
│       ├── bayit-add-subtitles.sh
│       └── ... (other scripts)
└── docs/
    └── nlp/
        └── OLORIN_CLI_SCRIPT_EXECUTION.md (THIS FILE)
```

## Future Enhancements

1. **Add More Scripts**: Create bash wrappers for remaining Python scripts
2. **Script Discovery**: Auto-generate tool definitions from script directory
3. **Parameter Validation**: Enhance input validation for each tool
4. **Progress Tracking**: Stream execution progress for long-running scripts
5. **Rollback Support**: Implement automatic rollback for failed operations
6. **Batch Operations**: Support multiple tool executions in single session

## Related Files

- Backend Tool Registry: `backend/app/services/nlp/tool_registry.py`
- Backend Tool Dispatcher: `backend/app/services/nlp/tool_dispatcher.py`
- Agent Executor: `backend/app/services/nlp/agent_executor.py`
- Organize Series Script: `scripts/organize_series.py`
- Organize Series Wrapper: `scripts/bayit-organize-series.sh`

## Conclusion

The Olorin CLI can now execute operational scripts directly through natural language commands, with proper safety controls (confirmation for destructive operations) and comprehensive error handling. This enables automated content management workflows while maintaining security and user oversight.
