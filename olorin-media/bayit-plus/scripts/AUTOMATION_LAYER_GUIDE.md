# Automation Layer Generation Guide

## Overview

Every Python script in the Bayit+ project should have three corresponding automation interfaces:

1. **Bash Wrapper** - Command-line interface with argument parsing
2. **Claude Skill** - Integration with Claude Code
3. **Olorin Tool** - NLP agent tool definition

This guide explains how to generate these automatically.

## Quick Start

### Generate for Single Script

```bash
./scripts/generate-automation-layer.sh \
  --input scripts/backend/content/organize_series.py \
  --category content \
  --platform bayit
```

Output:
```
✓ Created bash wrapper: bayit-organize-series.sh
✓ Created Claude skill: bayit:content:organize-series
✓ Created tool definition: organize_series
```

### Generate for Entire Directory

```bash
./scripts/generate-automation-layer.sh \
  --input scripts/backend/content/ \
  --category content \
  --platform bayit \
  --batch
```

### Auto-Detect Category from Path

```bash
./scripts/generate-automation-layer.sh \
  --input scripts/backend/podcasts/sync_podcasts.py \
  --platform bayit \
  --auto-categorize
```

Will automatically detect category as "podcasts" from path.

## Categories

Scripts are organized into categories based on their function:

| Category | Description | Example Scripts |
|----------|-------------|-----------------|
| `content` | Content management (movies, series) | organize_series, attach_posters |
| `podcasts` | Podcast operations | sync_podcasts, translate_podcast |
| `database` | Database operations | backup_database, restore_database |
| `maintenance` | Regular maintenance tasks | cleanup_orphans, find_duplicates |
| `testing` | Testing utilities | test_streams, check_content |
| `production` | Production operations | deploy, monitoring |
| `deployment` | Deployment scripts | deploy_staging, rollback |
| `general` | Uncategorized | misc utilities |

## Generated Artifacts

### 1. Bash Wrapper

**Location**: Same directory as Python script
**Naming**: `{platform}-{script_name}.sh`
**Example**: `bayit-organize-series.sh`

**Features**:
- Automatic Poetry environment detection
- Argument parsing with help text
- Colored output and progress indicators
- Prerequisite checking
- Error handling and exit codes

**Usage**:
```bash
cd backend
bash ../scripts/backend/content/bayit-organize-series.sh --dry-run --limit 10
```

### 2. Claude Skill

**Location**: `~/.claude/commands/`
**Naming**: `{platform}-{category}-{script-name}.md`
**Example**: `bayit-content-organize-series.md`

**Features**:
- Natural language description
- Parameter documentation
- Usage examples
- Integration with bash wrapper

**Usage**:
```
/bayit:content:organize-series
/bayit:content:organize-series --limit 10
/bayit:content:organize-series --dry-run=false
```

### 3. Olorin Tool

**Location**: `scripts/generated-tools/`
**Naming**: `{platform}-{script_name}.json`
**Example**: `bayit-organize_series.json`

**Features**:
- JSON schema for parameters
- Destructive flag where applicable
- Handler configuration
- Example usage

**Integration**: Automatically added to `tool_registry.py` and `tool_dispatcher.py` during build

## Options Reference

### generate-automation-layer.sh Options

| Option | Description | Required | Example |
|--------|-------------|----------|---------|
| `--input PATH` | Python script or directory | Yes | `scripts/backend/content/organize_series.py` |
| `--category NAME` | Category for organization | Conditional | `content`, `podcasts`, `database` |
| `--platform NAME` | Target platform | No (default: bayit) | `bayit`, `fraud`, `cvplus` |
| `--batch` | Process entire directory | No | - |
| `--auto-categorize` | Auto-detect category from path | No | - |
| `--dry-run` | Preview without creating files | No | - |
| `--force` | Overwrite existing files | No | - |

## Workflow

### For New Python Script

When you create a new Python script:

1. **Write the Python script** with proper docstring:
   ```python
   """
   Organize all series in the database by grouping episodes.

   This script scans the database for series content, extracts
   season and episode information, and creates parent series objects.
   """
   ```

2. **Generate automation layer**:
   ```bash
   ./scripts/generate-automation-layer.sh \
     --input path/to/your_script.py \
     --category content \
     --platform bayit
   ```

3. **Test the generated files**:
   ```bash
   # Test bash wrapper
   bash path/to/bayit-your-script.sh --help
   bash path/to/bayit-your-script.sh --dry-run

   # Test Claude skill
   /bayit:content:your-script --help

   # Test Olorin tool (via API)
   curl -X POST http://localhost:8090/api/v1/nlp/execute-agent \
     -H "Content-Type: application/json" \
     -d '{"query": "run your script", "platform": "bayit"}'
   ```

4. **Customize if needed**:
   - Edit bash wrapper for custom arguments
   - Update Claude skill with better examples
   - Adjust tool schema for validation

5. **Commit all three artifacts**:
   ```bash
   git add path/to/your_script.py
   git add path/to/bayit-your-script.sh
   git add ~/.claude/commands/bayit-content-your-script.md
   git add scripts/generated-tools/bayit-your_script.json
   git commit -m "feat(content): add your_script with automation layer"
   ```

### For Existing Scripts (Batch Generation)

Process entire directories to generate automation layers:

```bash
# Generate for all backend content scripts
./scripts/generate-automation-layer.sh \
  --input scripts/backend/content/ \
  --category content \
  --platform bayit \
  --batch

# Generate for all podcast scripts
./scripts/generate-automation-layer.sh \
  --input scripts/backend/podcasts/ \
  --platform bayit \
  --batch \
  --auto-categorize

# Generate for ALL backend scripts
./scripts/generate-automation-layer.sh \
  --input scripts/backend/ \
  --platform bayit \
  --batch \
  --auto-categorize
```

## Templates

Templates are located in `scripts/shared/templates/`:

### bash-wrapper-template.sh

Base template for bash wrappers with:
- Standard header with documentation
- Argument parsing boilerplate
- Prerequisite checking
- Poetry integration
- Colored output helpers

### claude-skill-template.md

Base template for Claude skills with:
- Skill description
- Parameter documentation
- Usage examples
- Implementation details

### olorin-tool-template.json

Base template for Olorin tools with:
- JSON schema structure
- Handler configuration
- Example definitions
- Metadata fields

## Customization

### Custom Bash Wrapper

After generation, you can customize:

```bash
# Generated wrapper
scripts/backend/content/bayit-organize-series.sh

# Add custom validation
check_prerequisites() {
    # ... existing checks ...

    # Add custom prerequisite
    if [ ! -f "$HOME/.tmdb_api_key" ]; then
        echo -e "${RED}✖ TMDB API key not found${NC}"
        exit 1
    fi
}

# Add custom options
while [[ $# -gt 0 ]]; do
    case $1 in
        # ... existing options ...
        --tmdb-key)
            TMDB_KEY="$2"
            shift 2
            ;;
    esac
done
```

### Custom Claude Skill

Add workflow steps:

```markdown
## Multi-Step Workflow

1. First, run in dry-run mode:
   \`\`\`
   /bayit:content:organize-series --dry-run
   \`\`\`

2. Review the output

3. Execute for real:
   \`\`\`
   /bayit:content:organize-series --dry-run=false
   \`\`\`

4. Verify results:
   \`\`\`
   /bayit:content:check-series-integrity
   \`\`\`
```

### Custom Olorin Tool

Adjust schema for validation:

```json
{
  "properties": {
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000,
      "description": "Number of series to process (1-1000)"
    }
  }
}
```

## Integration with Tool Registry

Generated tool definitions need to be integrated into `tool_registry.py` and `tool_dispatcher.py`.

### Manual Integration (Current)

1. Copy tool definition from `scripts/generated-tools/bayit-{tool_name}.json`
2. Add to `PLATFORM_TOOLS["bayit"]` in `tool_registry.py`
3. Add handler case in `execute_bayit_tool()` in `tool_dispatcher.py`
4. Add to `DESTRUCTIVE_TOOLS` if applicable

### Automated Integration (Future)

A build script will automatically:
- Scan `scripts/generated-tools/`
- Generate `tool_registry.py` entries
- Generate `tool_dispatcher.py` handlers
- Update `DESTRUCTIVE_TOOLS` set

## Progress Tracking

Track progress of automation layer generation:

```bash
# Generate progress report
./scripts/automation-progress-report.sh

# Output:
# Automation Layer Coverage Report
# ================================
#
# Total Python Scripts: 189
# ✓ With Bash Wrapper: 25 (13%)
# ✓ With Claude Skill: 15 (8%)
# ✓ With Olorin Tool: 20 (11%)
# ⊙ Fully Automated: 10 (5%)
#
# Scripts Needing Automation:
# - scripts/backend/content/add_channel_12.py
# - scripts/backend/content/add_existing_movies_to_db.py
# [... list continues ...]
```

## Best Practices

1. **Always include docstrings** in Python scripts - used for descriptions
2. **Use argparse** for argument parsing - auto-detected by generator
3. **Follow naming conventions** - `{action}_{target}.py` format
4. **Test generated artifacts** before committing
5. **Customize when needed** but keep structure consistent
6. **Document custom changes** in script comments
7. **Update templates** if you find common patterns

## Troubleshooting

### "Poetry not found" Error

Ensure Poetry is installed and in PATH:
```bash
which poetry
# If not found:
curl -sSL https://install.python-poetry.org | python3 -
```

### "Template not found" Error

Ensure templates exist:
```bash
ls scripts/shared/templates/
# Should show:
# - bash-wrapper-template.sh
# - claude-skill-template.md
# - olorin-tool-template.json
```

### Bash Wrapper Doesn't Execute

Check:
1. Executable permissions: `chmod +x scripts/path/to/wrapper.sh`
2. Shebang line present: `#!/usr/bin/env bash`
3. Python script path correct in wrapper
4. Poetry environment accessible from backend directory

### Claude Skill Not Found

Check:
1. Skill file exists: `ls ~/.claude/commands/bayit-*.md`
2. Skill registered: `cat ~/.claude/commands.json`
3. Claude Code restarted after adding skill

### Olorin Tool Not Working

Check:
1. Tool added to `tool_registry.py`
2. Handler added to `tool_dispatcher.py`
3. Backend server restarted
4. Tool marked destructive if applicable

## Examples

### Content Management Script

```bash
# Input: scripts/backend/content/attach_posters.py
./scripts/generate-automation-layer.sh \
  --input scripts/backend/content/attach_posters.py \
  --category content \
  --platform bayit

# Generates:
# - scripts/backend/content/bayit-attach-posters.sh
# - ~/.claude/commands/bayit-content-attach-posters.md
# - scripts/generated-tools/bayit-attach_posters.json
```

### Podcast Script

```bash
# Input: scripts/backend/podcasts/sync_podcasts.py
./scripts/generate-automation-layer.sh \
  --input scripts/backend/podcasts/sync_podcasts.py \
  --category podcasts \
  --platform bayit

# Usage after generation:
# Bash: bash scripts/backend/podcasts/bayit-sync-podcasts.sh
# Skill: /bayit:podcasts:sync-podcasts
# Tool: "sync podcasts from RSS feeds"
```

### Database Script

```bash
# Input: scripts/backend/database/backup_database.py
./scripts/generate-automation-layer.sh \
  --input scripts/backend/database/backup_database.py \
  --category database \
  --platform bayit

# Marks as destructive in tool registry
```

## Next Steps

1. Generate automation layers for all 189 Python scripts
2. Test each generated artifact
3. Customize where needed
4. Integrate into CI/CD pipeline
5. Document custom scripts in team wiki

## Support

For issues or questions:
- Check `scripts/ORGANIZATION_PLAN.md` for context
- Review templates in `scripts/shared/templates/`
- Ask in #olorin-development Slack channel

---

*Last updated: 2026-01-26*
*Maintainer: Olorin Development Team*
