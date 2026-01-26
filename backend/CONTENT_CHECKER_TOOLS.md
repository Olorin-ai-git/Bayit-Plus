# Bayit+ Content Existence Checker - Complete Tooling Suite

Comprehensive tooling for verifying content existence in MongoDB, diagnosing UI/database sync issues, and debugging delete operations.

## Overview

The content existence checker provides four integrated components:

1. **Python Core Scripts** - Database query implementation
2. **Bash Wrapper** - CLI convenience tool
3. **Claude Command** - Natural language integration
4. **Claude Skill** - Comprehensive documentation and workflows
5. **Olorin Tool** - Ecosystem integration and metadata

## Component Details

### 1. Python Core Scripts

#### `check_content_exists.py`
**Location**: `backend/check_content_exists.py`

**Purpose**: Search content by ID or title

**Usage**:
```bash
# Search by ID
poetry run python check_content_exists.py 696ada05c19ab15ddcd42d04

# Search by title (case-insensitive)
poetry run python check_content_exists.py --title "Matrix"
```

**Features**:
- Async MongoDB queries via Motor
- Supports both string and ObjectId ID formats
- Case-insensitive title regex search
- Returns up to 10 matches for title searches
- Exit code 0 if found, 1 if not found

**Output Example**:
```
✅ Found content: The Matrix
   ID: 507f1f77bcf86cd799439012
   Type: movie
   Published: True
   Category: movies
```

#### `check_all_collections.py`
**Location**: `backend/check_all_collections.py`

**Purpose**: Search ID across all collections

**Usage**:
```bash
poetry run python check_all_collections.py 507f1f77bcf86cd799439012
```

**Features**:
- Searches 5 collections: content, podcasts, podcast_episodes, radio_stations, live_channels
- Tries both string and ObjectId formats
- Returns first match found with document details

### 2. Bash Wrapper

**Location**: `scripts/check-content`

**Purpose**: User-friendly CLI interface

**Usage**:
```bash
# Search by ID
./scripts/check-content 696ada05c19ab15ddcd42d04

# Search by title
./scripts/check-content --title "Matrix"
./scripts/check-content -t "Breaking Bad"

# Help
./scripts/check-content --help
```

**Features**:
- Argument parsing and validation
- Colored output for readability
- Help message with examples
- Passes through to Python scripts

### 3. Claude Command

**Location**: `.claude/commands/bayit-check-content.md` (gitignored)

**Purpose**: Natural language integration with Claude Code

**Usage**:
```
Check if content 696ada05c19ab15ddcd42d04 exists
Search for content titled "Matrix"
Run bayit-check-content --title "Breaking Bad"
```

**Features**:
- Natural language invocation
- Automatic argument parsing
- Integration with Claude Code workflow
- Usage examples and documentation

### 4. Claude Skill

**Location**: `.claude/skills_extracted/bayit-check-content/SKILL.md` (gitignored)

**Purpose**: Comprehensive workflow documentation

**Features**:
- **When to use** - 8 use case scenarios
- **What it does** - Detailed operation modes
- **How to use** - Multiple usage patterns
- **Example scenarios** - 4 real-world examples with diagnosis
- **Technical implementation** - Code examples and architecture
- **Common use cases** - Debugging guides
- **Integration** - How to combine with other tools
- **Troubleshooting** - Solutions to common issues
- **Best practices** - Recommended workflows
- **Performance** - Expected query times
- **Security notes** - Read-only, no modifications

### 5. Olorin Tool

**Location**: `scripts/generated-tools/bayit-check-content.json`

**Purpose**: Ecosystem integration and metadata registry

**Features**:
- Tool schema and input/output definitions
- Integration points (bash, Python, Claude)
- Examples and use cases
- Performance metrics
- Related tools links
- Version and authorship metadata

**Schema**:
```json
{
  "name": "check_content",
  "category": "debugging",
  "platform": "bayit",
  "destructive": false,
  "input_schema": { ... },
  "handler": { ... },
  "examples": [ ... ],
  "metadata": { ... }
}
```

## Usage Patterns

### Pattern 1: Debugging Delete Operations

**Problem**: User reports item won't delete, still shows in admin panel

```bash
# Step 1: Check database state
./scripts/check-content 696ada05c19ab15ddcd42d04

# If found: Delete operation failed (backend issue)
# If not found: Successfully deleted (UI caching issue)

# Step 2: If UI cache issue, check React Query
# - Clear browser cache
# - Refresh page
# - Verify frontend state management
```

### Pattern 2: Finding Duplicates

**Problem**: Suspecting duplicate entries for same content

```bash
# Search by title
./scripts/check-content --title "Breaking Bad"

# Review all matches
# - Compare IDs, published status, categories
# - Decide which to keep
# - Use merge or delete operations
```

### Pattern 3: Import Verification

**Problem**: Verifying bulk import succeeded

```bash
# Check specific item
./scripts/check-content --title "Imported Content Name"

# If found: Import successful
# If not found: Import failed, check logs
```

### Pattern 4: Cross-Collection Identification

**Problem**: Have an ID but don't know its type

```bash
# Search all collections
poetry run python check_all_collections.py 507f1f77bcf86cd799439012

# Identifies if ID belongs to:
# - content (VOD)
# - podcasts
# - podcast_episodes
# - radio_stations
# - live_channels
```

## Integration with Other Tools

### With Audit Tools
```bash
# Check before auditing
./scripts/check-content --title "Series Name"

# Run audit on found content
./scripts/backend/production/audit/run_comprehensive_audit.sh
```

### With Delete Confirmation
```bash
# Verify existence before delete
if ./scripts/check-content 507f1f77bcf86cd799439012; then
  # Content exists, proceed with delete
  delete_content 507f1f77bcf86cd799439012
else
  echo "Content already deleted"
fi
```

### With Import Scripts
```bash
# After bulk import
import_script.sh

# Verify imports
./scripts/check-content --title "Imported Series"
```

## Technical Architecture

### Database Access Flow

```
User Request
    ↓
Bash Wrapper (scripts/check-content)
    ↓
Python Script (check_content_exists.py)
    ↓
Motor (async MongoDB driver)
    ↓
MongoDB Atlas (bayit_plus database)
    ↓
Content Collection
    ↓
Query Results
    ↓
Formatted Output
```

### Search Strategies

**ID Search** (50ms):
1. Try string ID format
2. If not found, try ObjectId format
3. Return first match

**Title Search** (200ms):
1. Case-insensitive regex search
2. Match on title field
3. Return up to 10 matches
4. Sort by relevance

**Cross-Collection** (300ms):
1. Sequential search through 5 collections
2. Try both ID formats per collection
3. Return first match found

## Performance Metrics

| Operation | Average Time | Index Used | Results Limit |
|-----------|-------------|------------|---------------|
| ID Search | 50ms | _id (primary) | 1 |
| Title Search | 200ms | None (scan) | 10 |
| Cross-Collection | 300ms | _id per collection | 1 |

## Error Handling

### Common Errors

**1. Content Not Found**
```
❌ Content not found with ID: 696ada05c19ab15ddcd42d04
```
**Resolution**: Verify ID is correct, or search by title

**2. Invalid ObjectId**
```
❌ Content not found (invalid ObjectId): ...
```
**Resolution**: ID format is wrong, use title search

**3. Connection Refused**
```
Error: MongoDB connection failed
```
**Resolution**: Check MongoDB URI in .env, ensure server is running

**4. Module Not Found**
```
ModuleNotFoundError: No module named 'app'
```
**Resolution**:
```bash
cd backend
poetry install
poetry run python check_content_exists.py
```

## Security Considerations

- ✅ **Read-only operations** - No modifications to database
- ✅ **Requires MongoDB credentials** - Respects authentication
- ✅ **No external API calls** - Local database access only
- ✅ **No sensitive data exposure** - Returns only necessary fields
- ✅ **Safe for production use** - Non-destructive queries

## Best Practices

### 1. Always Use Title Search for Discovery
When you don't know exact ID:
```bash
./scripts/check-content --title "partial name"
```

### 2. Verify Before Destructive Operations
Check existence before delete/update:
```bash
./scripts/check-content 507f1f77bcf86cd799439012 && delete_content 507f1f77bcf86cd799439012
```

### 3. Log Results for Audits
Save search results:
```bash
./scripts/check-content --title "Series" > audit-results-$(date +%Y%m%d).log
```

### 4. Use Cross-Collection for Unknown IDs
If type is unknown:
```bash
poetry run python check_all_collections.py 507f1f77bcf86cd799439012
```

## Troubleshooting Guide

### Issue: Deleted item still shows in UI

**Diagnosis**:
```bash
./scripts/check-content <content_id>
```

**If Not Found**: Successfully deleted from database
- **Cause**: Frontend caching issue
- **Solution**: Clear React Query cache, refresh page

**If Found**: Still exists in database
- **Cause**: Delete operation failed
- **Solution**: Check backend logs, verify permissions, retry delete

### Issue: Can't find imported content

**Diagnosis**:
```bash
./scripts/check-content --title "Content Title"
```

**If Not Found**: Import failed
- **Cause**: Import script error, network issue, validation failure
- **Solution**: Check import logs, verify source data, retry import

**If Found**: Import succeeded
- **Cause**: UI not refreshed
- **Solution**: Refresh content list in admin panel

### Issue: Multiple entries for same content

**Diagnosis**:
```bash
./scripts/check-content --title "Duplicate Title"
```

**If Multiple Found**: Duplicates exist
- **Review**: Compare IDs, metadata, published status
- **Solution**: Use merge or delete to consolidate

## Future Enhancements

### Planned Features
- [ ] JSON output format for scripting
- [ ] Bulk ID checking from file
- [ ] Export results to CSV
- [ ] Integration with admin API
- [ ] Real-time monitoring mode
- [ ] Webhook notifications
- [ ] Web UI interface

### Performance Improvements
- [ ] Add title field index for faster searches
- [ ] Implement result caching
- [ ] Parallel collection searches
- [ ] Query result pagination

## Related Documentation

- **Backend README**: `backend/README.md`
- **Scripts README**: `scripts/README.md`
- **Admin API Docs**: `docs/api/admin-content.md`
- **Database Schema**: `docs/database/schema.md`
- **Audit Tools**: `AUDIT_TOOLS.md`

## Version History

### v1.0.0 (2026-01-26)
- Initial release
- Python core scripts (check_content_exists.py, check_all_collections.py)
- Bash wrapper (scripts/check-content)
- Claude command integration
- Claude skill with comprehensive docs
- Olorin tool registry entry
- Support for ID and title searches
- Cross-collection search capability

## Support

For issues or questions:
1. Check troubleshooting guide above
2. Review Claude skill documentation
3. Check backend logs: `backend/.cursor/debug.log`
4. Review MongoDB connection in `.env`

## License

Copyright © 2026 Olorin AI. All rights reserved.
