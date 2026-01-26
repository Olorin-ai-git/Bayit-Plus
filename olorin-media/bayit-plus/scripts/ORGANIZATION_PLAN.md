# Script Organization Plan

## Current Problem

Scripts are scattered across:
- `/scripts/` (root level - mixed purposes)
- `/scripts/backend/` (backend-specific)
- `/scripts/web/` (web-specific)
- `/backend/scripts/` (some scripts here too)
- Various subdirectories with unclear purpose

**Issues**:
1. Hard to find specific scripts
2. Unclear which scripts start from which directory
3. Difficult to maintain and update
4. No clear naming conventions
5. Mixed execution contexts (some need Poetry, some need npm, some are standalone)

## Proposed Structure

```
scripts/
├── README.md                          # Master index with all scripts
├── ORGANIZATION_PLAN.md               # This file
│
├── platform/                          # Platform-wide scripts (run from project root)
│   ├── bayit.sh                      # Main Olorin CLI entry point
│   ├── bayit-health.sh               # Health check
│   ├── bayit-status.sh               # Platform status
│   ├── bayit-interactive.sh          # Interactive mode
│   ├── install.sh                    # Project setup
│   └── validate-env.sh               # Environment validation
│
├── backend/                           # Backend scripts (run with Poetry from /backend)
│   ├── README.md                     # Backend scripts index
│   ├── content/                      # Content management
│   │   ├── bayit-organize-series.sh
│   │   ├── bayit-attach-posters.sh
│   │   ├── bayit-add-subtitles.sh
│   │   ├── bayit-cleanup-titles.sh
│   │   └── organize_series.py
│   ├── podcasts/                     # Podcast operations
│   │   ├── bayit-sync-podcasts.sh
│   │   ├── bayit-translate-podcast.sh
│   │   ├── bayit-update-podcast-covers.sh
│   │   └── bayit-attach-podcast-radio-posters.sh
│   ├── database/                     # Database operations
│   │   ├── backup_database.sh
│   │   ├── restore_database.sh
│   │   ├── migrate_schema.sh
│   │   └── verify_integrity.sh
│   ├── maintenance/                  # Regular maintenance
│   │   ├── cleanup_orphans.py
│   │   ├── find_duplicates.py
│   │   └── reindex_search.sh
│   ├── testing/                      # Backend testing
│   │   ├── test_all_streams.py
│   │   ├── check_content_stats.py
│   │   └── test_security.sh
│   └── production/                   # Production operations
│       ├── deployment/
│       ├── audit/
│       └── monitoring/
│
├── web/                               # Web frontend scripts (run with npm from /web)
│   ├── README.md                     # Web scripts index
│   ├── build/
│   │   ├── analyze-bundle.sh
│   │   └── detect-stylesheets.sh
│   ├── testing/
│   │   ├── run-visual-regression.sh
│   │   └── validate-touch-targets.sh
│   └── deployment/
│       └── verify-deployment.sh
│
├── mobile/                            # Mobile app scripts (React Native)
│   ├── README.md                     # Mobile scripts index
│   ├── ios/
│   │   ├── build-ios.sh
│   │   ├── deploy-ios.sh
│   │   └── setup-signing.sh
│   ├── android/
│   │   ├── build-android.sh
│   │   └── deploy-android.sh
│   └── shared/
│       ├── fix-console-logs.py
│       └── update-assets.sh
│
├── tv-platforms/                      # TV platform scripts
│   ├── README.md
│   ├── tvos/
│   │   ├── build-tvos.sh
│   │   └── localization-audit.sh
│   └── android-tv/
│       └── build-android-tv.sh
│
├── deployment/                        # Cross-platform deployment
│   ├── README.md
│   ├── deploy-all-platforms.sh
│   ├── deploy-staging.sh
│   ├── deploy-phase.sh
│   ├── rollback-phase.sh
│   └── smoke-tests-staging.sh
│
├── shared/                            # Shared utilities and libraries
│   ├── common/
│   │   ├── colors.sh
│   │   ├── logging.sh
│   │   ├── prerequisites.sh
│   │   ├── health-check.sh
│   │   ├── docker-utils.sh
│   │   └── firebase-deploy.sh
│   └── templates/
│       ├── script-template.sh
│       └── python-script-template.py
│
└── infrastructure/                    # Infrastructure and DevOps
    ├── README.md
    ├── cloud/
    │   ├── setup-cloud-secrets.sh
    │   └── update-cloud-schedulers.sh
    ├── git/
    │   ├── setup-git-secrets.sh
    │   └── verify-hooks.sh
    └── monitoring/
        └── setup-monitoring.sh
```

## Naming Convention

### Script Naming

**Pattern**: `{platform}-{action}-{target}.{ext}`

Examples:
- `bayit-organize-series.sh` - Bayit+ platform, organize action, series target
- `backend-backup-database.sh` - Backend platform, backup action, database target
- `web-analyze-bundle.sh` - Web platform, analyze action, bundle target

**Exceptions**:
- Platform-wide entry points: `bayit.sh`, `install.sh`
- Shared utilities: `colors.sh`, `logging.sh`

### Python Script Naming

**Pattern**: `{action}_{target}.py`

Examples:
- `organize_series.py`
- `find_duplicates.py`
- `backup_database.py`

## Execution Context Documentation

Every script must include a header specifying:

```bash
#!/usr/bin/env bash
# =============================================================================
# Script Name
# =============================================================================
#
# Purpose: Brief description
#
# Execution Context:
#   - Working Directory: /path/to/required/dir
#   - Dependencies: Poetry, Node.js 20+, etc.
#   - Prerequisites: Backend running, database accessible, etc.
#
# Usage:
#   script-name.sh [options]
#
# Options:
#   --option    Description
#
# Examples:
#   script-name.sh --dry-run
#   script-name.sh --limit 10
#
# =============================================================================
```

## README Files

Each subdirectory must have a README.md with:

1. **Purpose**: What scripts in this directory do
2. **Prerequisites**: What needs to be installed/configured
3. **Execution Context**: Where to run scripts from
4. **Script Index**: Table of all scripts with descriptions
5. **Common Patterns**: How scripts in this directory typically work

### Example Backend README

```markdown
# Backend Scripts

Scripts for backend content management, database operations, and maintenance.

## Prerequisites

- Python 3.11+
- Poetry installed
- MongoDB Atlas connection configured
- Google Cloud credentials set up

## Execution Context

**ALL backend scripts must be run from the `/backend` directory using Poetry:**

\`\`\`bash
cd backend
poetry run python ../scripts/backend/content/organize_series.py
\`\`\`

Or use the bash wrappers:

\`\`\`bash
cd backend
bash ../scripts/backend/content/bayit-organize-series.sh
\`\`\`

## Script Index

| Script | Description | Destructive | Execution Time |
|--------|-------------|-------------|----------------|
| organize_series.py | Organize series with TMDB metadata | ✓ | 5-30 min |
| attach_posters.sh | Find and attach missing posters | ✓ | 10-60 min |
| backup_database.sh | Create MongoDB backup | - | 5-10 min |

[...more scripts...]
```

## Migration Plan

### Phase 1: Create New Structure (Week 1)

1. Create new directory structure
2. Create README files for each directory
3. Create master scripts/README.md index
4. Add execution context headers to all scripts

### Phase 2: Move Scripts (Week 2)

1. Move scripts to new locations (with git mv to preserve history)
2. Update all script references in:
   - Tool registry (tool_dispatcher.py, tool_registry.py)
   - Documentation
   - GitHub Actions workflows
   - Package.json scripts
   - Other scripts that call these scripts

### Phase 3: Update Documentation (Week 3)

1. Update all documentation to reference new locations
2. Create migration guide for developers
3. Update CI/CD pipelines
4. Test all scripts in new locations

### Phase 4: Deprecate Old Locations (Week 4)

1. Add deprecation warnings to old script locations
2. Create symlinks from old to new locations (temporary)
3. Update team on new structure
4. Monitor for any missed references

### Phase 5: Create Automation Layer (Week 5) - **NEW**

**Goal**: Every Python script gets three corresponding automation interfaces:
1. **Bash Wrapper** - Command-line interface
2. **Claude Skill** - Claude Code integration
3. **Olorin Tool** - NLP agent tool definition

#### 5.1 Bash Wrapper Requirements

Each Python script `{name}.py` gets a corresponding `{platform}-{name}.sh`:

**Features**:
- Automatic Poetry environment detection
- Argument parsing and validation
- Help text generation from Python docstrings
- Dry-run support where applicable
- Colored output and progress indicators
- Error handling and exit codes
- Prerequisite checking

**Example**:
```bash
# For: scripts/backend/content/organize_series.py
# Create: scripts/backend/content/bayit-organize-series.sh

bayit-organize-series.sh --dry-run --limit 10
```

#### 5.2 Claude Skill Requirements

Each Python script gets a corresponding Claude skill in `~/.claude/commands/`:

**Naming**: `bayit:{category}:{action}` (e.g., `bayit:content:organize-series`)

**Features**:
- Natural language description
- Parameter documentation
- Usage examples
- Integration with bash wrapper
- Multi-step workflows where needed

**Example**:
```markdown
# /organize-series

Organize all series in the database by grouping episodes into series, fetching TMDB metadata, and creating parent objects.

## Parameters
- `--dry-run`: Preview changes without applying (default: true)
- `--limit N`: Process only N series

## Examples
- `/organize-series` - Dry run all series
- `/organize-series --limit 10` - Test on 10 series
- `/organize-series --dry-run=false` - Execute organization
```

#### 5.3 Olorin Tool Requirements

Each Python script gets a tool definition in `tool_registry.py`:

**Features**:
- JSON schema for parameters
- Destructive flag where applicable
- Platform association (bayit, fraud, cvplus)
- Handler in `tool_dispatcher.py`

**Example**:
```python
{
    "name": "organize_series",
    "description": "Organize all series with TMDB metadata",
    "input_schema": {
        "type": "object",
        "properties": {
            "dry_run": {"type": "boolean", "default": False},
            "limit": {"type": "integer", "default": None}
        }
    }
}
```

#### 5.4 Automation Tools

Create three automation scripts:

1. **`generate-bash-wrapper.sh`**
   - Input: Python script path
   - Output: Bash wrapper script
   - Auto-extracts docstrings, arguments, description

2. **`generate-claude-skill.sh`**
   - Input: Python script path + bash wrapper
   - Output: Claude skill markdown file
   - Auto-generates examples and documentation

3. **`generate-olorin-tool.sh`**
   - Input: Python script path + bash wrapper
   - Output: Tool definition JSON + handler code
   - Auto-detects parameters and types

4. **`generate-automation-layer.sh`** (Master Script)
   - Input: Python script or directory
   - Runs all three generators
   - Updates registries and indexes
   - Validates generated files

#### 5.5 Templates

Create templates for consistent generation:

**Templates Location**: `scripts/shared/templates/`

- `bash-wrapper-template.sh` - Bash script template
- `claude-skill-template.md` - Skill template
- `olorin-tool-template.json` - Tool definition template
- `tool-handler-template.py` - Handler code template

#### 5.6 Execution Plan

```bash
# Generate for single script
./scripts/generate-automation-layer.sh \
  --input scripts/backend/content/organize_series.py \
  --category content \
  --platform bayit

# Generate for entire directory
./scripts/generate-automation-layer.sh \
  --input scripts/backend/content/ \
  --category content \
  --platform bayit \
  --batch

# Generate for all backend scripts
./scripts/generate-automation-layer.sh \
  --input scripts/backend/ \
  --platform bayit \
  --batch \
  --auto-categorize
```

#### 5.7 Validation Requirements

Each generated artifact must pass:

**Bash Wrapper**:
- [ ] Executable permissions set
- [ ] Shebang present
- [ ] Help flag works
- [ ] Dry-run flag works (if applicable)
- [ ] Calls Python script correctly
- [ ] Error handling present

**Claude Skill**:
- [ ] Valid markdown format
- [ ] Has description section
- [ ] Has parameters section
- [ ] Has examples section
- [ ] Linked to bash wrapper
- [ ] Added to `commands.json`

**Olorin Tool**:
- [ ] Valid JSON schema
- [ ] All required properties defined
- [ ] Description is clear
- [ ] Added to `tool_registry.py`
- [ ] Handler added to `tool_dispatcher.py`
- [ ] Marked destructive if applicable
- [ ] Tests pass

#### 5.8 Progress Tracking

Create a tracking spreadsheet:

| Python Script | Bash Wrapper | Claude Skill | Olorin Tool | Status |
|--------------|--------------|--------------|-------------|--------|
| organize_series.py | ✅ | ⏳ | ✅ | In Progress |
| attach_posters.py | ⏳ | ⏳ | ⏳ | Not Started |
| ... | ... | ... | ... | ... |

**Target**: 100% coverage for all operational Python scripts

#### 5.9 Success Criteria

Phase 5 is complete when:
1. All 189 Python scripts have corresponding bash wrappers
2. All operational scripts have Claude skills
3. All operational scripts have Olorin tool definitions
4. All generated artifacts pass validation
5. Documentation updated with new commands
6. Team trained on new automation layer

## Master Script Index

Create `/scripts/README.md` with comprehensive index:

```markdown
# Bayit+ Scripts Master Index

Comprehensive index of all operational scripts organized by platform and purpose.

## Quick Links

- [Platform-Wide](#platform-wide) - Cross-platform utilities
- [Backend](#backend) - Content management, database operations
- [Web](#web) - Frontend build and testing
- [Mobile](#mobile) - iOS and Android apps
- [TV Platforms](#tv-platforms) - tvOS and Android TV
- [Deployment](#deployment) - Cross-platform deployment
- [Infrastructure](#infrastructure) - Cloud, DevOps, monitoring

## How to Use This Index

1. Find your script category below
2. Click the link to go to that section
3. Each script lists:
   - **Purpose**: What it does
   - **Context**: Where to run it from
   - **Prerequisites**: What's required
   - **Destructive**: Whether it modifies data
   - **Example**: How to run it

## Platform-Wide

Scripts that affect the entire platform.

| Script | Purpose | Context | Destructive |
|--------|---------|---------|-------------|
| `platform/bayit.sh` | Main Olorin CLI entry | Project root | - |
| `platform/install.sh` | Project setup | Project root | - |
| `platform/bayit-health.sh` | Health check | Project root | - |

[...continue for all categories...]
```

## Benefits of This Organization

1. **Clear Structure**: Easy to find scripts by platform and purpose
2. **Consistent Naming**: Predictable script names
3. **Documented Context**: Every script documents where to run it
4. **Easy Maintenance**: Related scripts grouped together
5. **Scalable**: Easy to add new scripts in the right place
6. **Tool Integration**: NLP agent tools map directly to script locations
7. **Onboarding**: New developers can quickly understand script organization

## Implementation Commands

```bash
# Create new directory structure
mkdir -p scripts/{platform,backend/{content,podcasts,database,maintenance,testing,production},web/{build,testing,deployment},mobile/{ios,android,shared},tv-platforms/{tvos,android-tv},deployment,shared/{common,templates},infrastructure/{cloud,git,monitoring}}

# Create README files
touch scripts/{README.md,backend/README.md,web/README.md,mobile/README.md,tv-platforms/README.md,deployment/README.md,shared/README.md,infrastructure/README.md}

# Move scripts (examples)
git mv scripts/bayit.sh scripts/platform/
git mv scripts/bayit-organize-series.sh scripts/backend/content/
git mv scripts/organize_series.py scripts/backend/content/

# Create master index
echo "Creating master index..."
# (Script to generate comprehensive index)
```

## Next Steps

1. Review and approve this plan
2. Execute Phase 1 (create structure + READMEs)
3. Execute Phase 2 (move scripts)
4. Update tool registry paths
5. Test all scripts work from new locations
6. Deploy to team

---

**Last Updated**: 2026-01-26
**Status**: Proposed - Awaiting Approval
**Owner**: Olorin Development Team
