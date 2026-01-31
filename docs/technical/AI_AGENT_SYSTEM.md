# AI Agent System Architecture

**Version:** 1.0.0
**Last Updated:** 2026-01-30
**Status:** ✅ Production

---

## Overview

The Bayit+ AI Agent System provides 50+ tools for automated content management, metadata enrichment, and system maintenance. Powered by Anthropic Claude, the agent orchestrates complex multi-step operations with built-in safety mechanisms and comprehensive logging.

**Key Features:**
- **50+ Tools** organized in 13 categories
- **Intelligent Tool Selection** via capability-based filtering
- **Agent Loop** with max iterations and budget controls
- **Issue Tracker** for automated problem detection
- **Structured Logging** with full execution context
- **Safety Mechanisms** including dry-run mode and approval gates

---

## Architecture

### System Components

```
┌────────────────────────────────────────────────────────────────┐
│                       ADMIN API                                │
│  POST /api/v1/admin/ai-agent/audit                            │
│  POST /api/v1/admin/ai-agent/enrich                           │
│  GET  /api/v1/admin/ai-agent/status                           │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│                    AI AGENT LOOP                               │
│  • Analyzes task requirements                                  │
│  • Selects appropriate tools                                   │
│  • Executes tool sequences                                     │
│  • Iterates until completion or max iterations                 │
└───────┬────────────────────────────┬───────────────────────────┘
        │                            │
        ▼                            ▼
┌──────────────────┐        ┌──────────────────────────────────┐
│  TOOL DISPATCHER │        │  ISSUE TRACKER                   │
│  • Routes calls  │        │  • Logs problems                 │
│  • Validates     │        │  • Categorizes findings          │
│  • Executes      │        │  • Generates reports             │
└────────┬─────────┘        └──────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                    50+ TOOL EXECUTORS                          │
│  • Search & Discovery   • Metadata Management                  │
│  • Content Auditing     • Taxonomy Management                  │
│  • Subtitle Operations  • Podcast Management                   │
│  • Database Operations  • File Operations                      │
│  • External APIs        • Content Intelligence                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Tool Categories

### 13 Categories, 50+ Tools

#### 1. Search & Discovery (5 tools)
- `search_vod_content` - Search movies, series, audiobooks
- `search_epg` - Search electronic program guide
- `search_live_channels` - Search live channels
- `search_podcasts` - Search podcasts
- `keyword_search` - Generic keyword search across all content

#### 2. Metadata Management (8 tools)
- `fetch_tmdb_metadata` - TMDB movie/series data
- `classify_content` - Classify content into categories
- `generate_titles` - Generate Hebrew/English titles
- `detect_language` - Detect content language
- `extract_genres` - Extract genre information
- `analyze_cultural_context` - Olorin cultural context
- `validate_metadata` - Check metadata completeness
- `enrich_metadata` - Auto-enrich from multiple sources

#### 3. Content Auditing (6 tools)
- `validate_stream_url` - Check stream playability
- `detect_duplicates` - Find duplicate content
- `check_integrity` - Verify content integrity
- `audit_missing_metadata` - Find incomplete metadata
- `validate_thumbnails` - Check thumbnail existence
- `scan_orphaned_files` - Find orphaned storage files

#### 4. Taxonomy Management (4 tools)
- `list_categories` - List content categories
- `add_category` - Add new category
- `update_tags` - Update content tags
- `merge_categories` - Merge duplicate categories

#### 5. Subtitle Operations (5 tools)
- `generate_subtitles` - Generate subtitles from audio
- `translate_subtitles` - Translate subtitle files
- `validate_subtitles` - Check subtitle sync
- `fetch_opensubtitles` - Download from OpenSubtitles
- `embed_subtitles` - Embed into video file

#### 6. Podcast Management (6 tools)
- `sync_podcast_episodes` - Sync RSS feed
- `enrich_podcast_metadata` - Auto-enrich metadata
- `validate_podcast_audio` - Check audio quality
- `generate_podcast_chapters` - Extract chapters
- `translate_podcast_description` - Translate descriptions
- `detect_podcast_language` - Detect audio language

#### 7. Database Operations (4 tools)
- `execute_query` - Run MongoDB query
- `bulk_update` - Bulk update documents
- `aggregate_data` - Run aggregation pipeline
- `create_index` - Create database index

#### 8. File Operations (3 tools)
- `read_file` - Read file from GCS
- `write_file` - Write file to GCS
- `validate_file` - Validate file format

#### 9. External APIs (4 tools)
- `call_tmdb_api` - TMDB API requests
- `call_opensubtitles_api` - OpenSubtitles API
- `call_elevenlabs_api` - ElevenLabs TTS/STT
- `call_olorin_api` - Olorin services

#### 10. Content Intelligence (3 tools)
- `detect_cultural_context` - Jewish/Israeli context
- `recommend_similar_content` - Content recommendations
- `analyze_content_quality` - Quality assessment

#### 11. Quality Assurance (2 tools)
- `run_tests` - Execute test suite
- `validate_data` - Data validation

#### 12. Reporting (2 tools)
- `generate_audit_report` - Create audit report
- `export_statistics` - Export usage stats

#### 13. System Maintenance (2 tools)
- `clear_cache` - Clear Redis cache
- `rebuild_search_index` - Rebuild Atlas search index

---

## Agent Loop

### Execution Flow

```python
# backend/app/services/ai_agent/agent.py
from anthropic import AsyncAnthropic
from typing import List, Dict

class AIAgent:
    """AI agent with tool execution capabilities."""

    def __init__(
        self,
        model: str = "claude-sonnet-4-5-20250929",
        max_iterations: int = 20,
        budget_limit: float = 5.0,
        dry_run: bool = False,
    ):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = model
        self.max_iterations = max_iterations
        self.budget_limit = budget_limit
        self.dry_run = dry_run
        self.tool_dispatcher = ToolDispatcher()
        self.issue_tracker = IssueTracker()
        self.logger = AgentLogger()

    async def execute_task(
        self,
        task: str,
        context: Dict = None,
    ) -> Dict:
        """
        Execute a task using available tools.

        Args:
            task: Task description
            context: Additional context for the agent

        Returns:
            Execution result with findings and statistics
        """
        iteration = 0
        total_cost = 0.0
        conversation_history = []

        # Initial system prompt with tool descriptions
        system_prompt = self._build_system_prompt()

        # Add task to conversation
        conversation_history.append({
            "role": "user",
            "content": task,
        })

        while iteration < self.max_iterations:
            iteration += 1

            # Call Claude with tools
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                messages=conversation_history,
                tools=self._get_tool_definitions(),
            )

            # Track cost
            cost = self._calculate_cost(response)
            total_cost += cost

            if total_cost > self.budget_limit:
                raise BudgetExceededError(
                    f"Budget limit ${self.budget_limit} exceeded"
                )

            # Check stop reason
            if response.stop_reason == "end_turn":
                # Agent finished
                break

            # Process tool calls
            if response.stop_reason == "tool_use":
                tool_results = []
                for content_block in response.content:
                    if content_block.type == "tool_use":
                        result = await self._execute_tool(content_block)
                        tool_results.append(result)

                # Add tool results to conversation
                conversation_history.append({
                    "role": "assistant",
                    "content": response.content,
                })
                conversation_history.append({
                    "role": "user",
                    "content": tool_results,
                })
            else:
                break

        # Generate final report
        return {
            "status": "completed",
            "iterations": iteration,
            "total_cost": total_cost,
            "findings": self.issue_tracker.get_findings(),
            "execution_log": self.logger.get_log(),
        }

    async def _execute_tool(self, tool_call) -> Dict:
        """Execute a tool and return result."""
        tool_name = tool_call.name
        tool_input = tool_call.input

        self.logger.log_tool_execution(tool_name, tool_input)

        try:
            if self.dry_run:
                result = {"dry_run": True, "would_execute": tool_name}
            else:
                result = await self.tool_dispatcher.execute(
                    tool_name,
                    **tool_input,
                )

            return {
                "type": "tool_result",
                "tool_use_id": tool_call.id,
                "content": json.dumps(result),
            }
        except Exception as e:
            error_result = {
                "error": str(e),
                "tool_name": tool_name,
            }
            self.issue_tracker.log_issue(
                severity="error",
                tool=tool_name,
                message=str(e),
            )
            return {
                "type": "tool_result",
                "tool_use_id": tool_call.id,
                "content": json.dumps(error_result),
                "is_error": True,
            }
```

---

## Tool Filtering

### Capability-Based Selection

```python
# backend/app/services/ai_agent/tool_filter.py
from typing import List, Dict

class ToolFilter:
    """Filter tools based on task requirements."""

    def filter_tools(
        self,
        task: str,
        all_tools: List[Dict],
        max_tools: int = 20,
    ) -> List[Dict]:
        """
        Select relevant tools for a task.

        Uses semantic analysis to match task requirements
        with tool capabilities.
        """
        # Analyze task requirements
        required_capabilities = self._analyze_task(task)

        # Score each tool
        scored_tools = []
        for tool in all_tools:
            score = self._score_tool_relevance(
                tool,
                required_capabilities,
            )
            scored_tools.append((score, tool))

        # Sort by score and return top tools
        scored_tools.sort(key=lambda x: x[0], reverse=True)
        return [tool for score, tool in scored_tools[:max_tools]]

    def _analyze_task(self, task: str) -> Dict:
        """Extract required capabilities from task description."""
        capabilities = {
            "search": any(word in task.lower() for word in ["find", "search", "locate"]),
            "metadata": any(word in task.lower() for word in ["metadata", "enrich", "classify"]),
            "audit": any(word in task.lower() for word in ["audit", "check", "validate", "verify"]),
            "subtitles": "subtitle" in task.lower(),
            "podcasts": "podcast" in task.lower(),
            "database": any(word in task.lower() for word in ["database", "query", "update"]),
        }
        return capabilities

    def _score_tool_relevance(
        self,
        tool: Dict,
        required_capabilities: Dict,
    ) -> float:
        """Score tool relevance based on capabilities."""
        score = 0.0

        # Match tool category to required capabilities
        category = tool.get("category", "")
        for capability, required in required_capabilities.items():
            if required and capability in category.lower():
                score += 1.0

        return score
```

---

## Adding New Tools

### Tool Registration

```python
# backend/app/services/ai_agent/tools/registry.py
from typing import Callable, Dict

class ToolRegistry:
    """Registry for agent tools."""

    def __init__(self):
        self._tools = {}

    def register(
        self,
        name: str,
        description: str,
        parameters: Dict,
        category: str,
    ):
        """Decorator to register a new tool."""
        def decorator(func: Callable):
            self._tools[name] = {
                "name": name,
                "description": description,
                "parameters": parameters,
                "category": category,
                "executor": func,
            }
            return func
        return decorator

    def get_tool_definitions(self) -> List[Dict]:
        """Get tool definitions for Claude API."""
        return [
            {
                "name": tool["name"],
                "description": tool["description"],
                "input_schema": {
                    "type": "object",
                    "properties": tool["parameters"],
                    "required": list(tool["parameters"].keys()),
                },
            }
            for tool in self._tools.values()
        ]

# Global registry
tool_registry = ToolRegistry()
```

### Example Tool Implementation

```python
# backend/app/services/ai_agent/executors/example_tool.py
from app.services.ai_agent.tools.registry import tool_registry

@tool_registry.register(
    name="validate_stream_url",
    description="Validate that a stream URL is playable",
    parameters={
        "content_id": {
            "type": "string",
            "description": "Content ID to validate",
        },
        "timeout": {
            "type": "integer",
            "description": "Timeout in seconds",
            "default": 10,
        },
    },
    category="content_auditing",
)
async def validate_stream_url(content_id: str, timeout: int = 10) -> Dict:
    """Validate stream URL playability."""
    from app.services.stream_validator import StreamValidator

    validator = StreamValidator()
    result = await validator.validate_stream(
        content_id=content_id,
        timeout=timeout,
    )

    return {
        "content_id": content_id,
        "is_playable": result.is_playable,
        "status_code": result.status_code,
        "latency_ms": result.latency_ms,
        "error": result.error if not result.is_playable else None,
    }
```

---

## Configuration

### Environment Variables

::: v-pre
```bash
# Google Cloud Secret Manager
ANTHROPIC_API_KEY=<from-secret-manager>
AI_AGENT_MODEL=claude-sonnet-4-5-20250929
AI_AGENT_MAX_ITERATIONS=20
AI_AGENT_BUDGET_LIMIT=5.0
AI_AGENT_DRY_RUN=false
AI_AGENT_ENABLE_LOGGING=true
AI_AGENT_LOG_LEVEL=info
```
:::

### Agent Configuration

```python
# backend/app/core/agent_config.py
from pydantic import BaseSettings

class AgentSettings(BaseSettings):
    """AI Agent configuration."""

    model: str = "claude-sonnet-4-5-20250929"
    max_iterations: int = 20
    budget_limit: float = 5.0
    dry_run: bool = False
    enable_logging: bool = True
    log_level: str = "info"

    # Tool filtering
    max_tools_per_task: int = 20
    enable_tool_filtering: bool = True

    # Safety
    require_approval_for_write_ops: bool = True
    enable_rollback: bool = True

    class Config:
        env_prefix = "AI_AGENT_"
        env_file = ".env"
```

---

## Safety Mechanisms

### 1. Dry Run Mode

```python
agent = AIAgent(dry_run=True)
result = await agent.execute_task("Validate all stream URLs")
# No actual operations performed, only simulation
```

### 2. Budget Limits

```python
agent = AIAgent(budget_limit=5.0)  # Max $5 per execution
# Raises BudgetExceededError if exceeded
```

### 3. Iteration Limits

```python
agent = AIAgent(max_iterations=20)  # Max 20 tool calls
# Prevents infinite loops
```

### 4. Approval Gates

```python
@tool_registry.register(
    name="delete_content",
    description="Delete content (REQUIRES APPROVAL)",
    parameters={...},
    category="dangerous_operations",
    requires_approval=True,
)
async def delete_content(content_id: str) -> Dict:
    """Delete content with approval gate."""
    if not await approval_service.get_approval(
        operation="delete_content",
        content_id=content_id,
    ):
        raise ApprovalRequiredError("User approval required")

    # Proceed with deletion
    ...
```

---

## Use Cases

### 1. Library Audit

```python
from app.services.ai_agent.agent import AIAgent

agent = AIAgent(model="claude-sonnet-4-5")
result = await agent.execute_task("""
Perform a comprehensive library audit:
1. Find all content with missing metadata
2. Validate stream URLs for all content
3. Detect duplicate content
4. Check for orphaned storage files
5. Generate detailed audit report
""")

print(f"Audit completed in {result['iterations']} iterations")
print(f"Found {len(result['findings'])} issues")
```

### 2. Metadata Enrichment

```python
result = await agent.execute_task("""
Enrich metadata for all movies:
1. Fetch TMDB data for movies missing it
2. Generate Hebrew titles where missing
3. Classify content into correct categories
4. Extract and validate genres
5. Detect cultural context (Israeli/Jewish)
""")
```

### 3. Stream Validation

```python
result = await agent.execute_task("""
Validate all live channel streams:
1. Check stream playability for each channel
2. Measure stream latency
3. Validate HLS manifest files
4. Report broken streams
5. Suggest fixes for common issues
""")
```

### 4. Duplicate Detection

```python
result = await agent.execute_task("""
Find and merge duplicate content:
1. Detect duplicates by title similarity
2. Compare metadata and stream URLs
3. Identify which entries to keep
4. Merge metadata from duplicates
5. Mark duplicates for deletion
""")
```

---

## Execution Modes

### Comprehensive Mode

```python
# Full analysis with all tools available
agent = AIAgent(
    model="claude-sonnet-4-5",
    max_iterations=50,
    budget_limit=20.0,
)
```

### Targeted Mode

```python
# Focused task with specific tools
from app.services.ai_agent.tool_filter import ToolFilter

filtered_tools = ToolFilter().filter_tools(
    task="Validate stream URLs",
    all_tools=registry.get_tools(),
    max_tools=5,
)

agent = AIAgent(
    model="claude-haiku-3-5",
    max_iterations=10,
    budget_limit=2.0,
    tools=filtered_tools,
)
```

### Scheduled Mode

```python
# Automated nightly audits
from app.services.scheduler import schedule_task

schedule_task(
    name="nightly_audit",
    cron="0 2 * * *",  # 2 AM daily
    task=lambda: agent.execute_task("Comprehensive library audit"),
)
```

### On-Demand Mode

```python
# Admin-triggered via API
@router.post("/api/v1/admin/ai-agent/audit")
async def trigger_audit(
    scope: str = "all_content",
    admin_id: str = Depends(require_admin),
):
    agent = AIAgent()
    result = await agent.execute_task(f"Audit {scope}")
    return result
```

---

## Monitoring

### Prometheus Metrics

```python
from prometheus_client import Counter, Histogram, Gauge

# Execution metrics
agent_executions_total = Counter(
    "bayit_ai_agent_executions_total",
    "Total agent executions",
    ["model", "status"],
)

agent_execution_duration_seconds = Histogram(
    "bayit_ai_agent_execution_duration_seconds",
    "Agent execution duration",
    ["model"],
)

agent_iterations = Histogram(
    "bayit_ai_agent_iterations",
    "Number of iterations per execution",
    ["model"],
)

agent_cost_dollars = Histogram(
    "bayit_ai_agent_cost_dollars",
    "Cost per execution",
    ["model"],
)

# Tool metrics
agent_tool_calls_total = Counter(
    "bayit_ai_agent_tool_calls_total",
    "Total tool calls",
    ["tool_name", "status"],
)

agent_tool_duration_seconds = Histogram(
    "bayit_ai_agent_tool_duration_seconds",
    "Tool execution duration",
    ["tool_name"],
)

# Issue tracking
agent_issues_detected_total = Counter(
    "bayit_ai_agent_issues_detected_total",
    "Total issues detected",
    ["severity", "category"],
)
```

---

## API Endpoints

### Admin Operations

```python
# backend/app/api/routes/admin/ai_agent.py
from fastapi import APIRouter, Depends
from app.services.ai_agent.agent import AIAgent
from app.services.auth_service import require_admin

router = APIRouter(prefix="/api/v1/admin/ai-agent", tags=["AI Agent"])

@router.post("/audit")
async def comprehensive_audit(
    scope: str = "all_content",
    admin_id: str = Depends(require_admin),
):
    """Perform comprehensive library audit."""
    agent = AIAgent(model="claude-sonnet-4-5")
    result = await agent.execute_task(f"Comprehensive audit of {scope}")
    return result

@router.post("/enrich")
async def enrich_metadata(
    content_ids: List[str],
    admin_id: str = Depends(require_admin),
):
    """Enrich metadata for specified content."""
    agent = AIAgent(model="claude-haiku-3-5")
    result = await agent.execute_task(
        f"Enrich metadata for content IDs: {', '.join(content_ids)}"
    )
    return result

@router.post("/validate")
async def validate_streams(
    section: str = "all",
    admin_id: str = Depends(require_admin),
):
    """Validate stream URLs."""
    agent = AIAgent(model="claude-haiku-3-5")
    result = await agent.execute_task(f"Validate streams for section: {section}")
    return result

@router.get("/status")
async def get_agent_status(admin_id: str = Depends(require_admin)):
    """Get current agent execution status."""
    # Return status of running agents
    pass
```

---

## Best Practices

1. **Use Sonnet for complex audits** - Better reasoning, worth the cost
2. **Use Haiku for high-volume operations** - Stream validation, quick checks
3. **Enable dry-run for testing** - Test agent behavior safely
4. **Set budget limits** - Prevent cost overruns
5. **Filter tools by task** - Reduce token usage, faster execution
6. **Monitor agent costs** - Track spending per execution
7. **Review issue tracker logs** - Identify recurring problems
8. **Schedule regular audits** - Automated maintenance

---

## Related Documentation

- [AI Features Overview](../features/AI_FEATURES_OVERVIEW.md) - AI feature catalog
- [LLM Configuration](../deployment/LLM_CONFIGURATION.md) - Model configuration

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** AI Team
**Next Review:** 2026-03-30
