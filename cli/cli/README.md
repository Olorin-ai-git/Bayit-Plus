# Olorin CLI - TypeScript Commands

TypeScript-based CLI for NLP-powered natural language commands and agent workflows.

## Installation

```bash
cd cli
npm install
npm run build
```

## Commands

### AI Commands (Natural Language Processing)

#### 1. Execute Natural Language Command

```bash
# Full syntax
olorin ai ask "upload family ties season 2 from usb" --dry-run

# Shorthand
olorin ai "upload family ties season 2 from usb" --dry-run

# Options
olorin ai ask <query> [options]
  --dry-run              Preview without executing (default: false)
  --platform <platform>  Target platform: bayit, fraud, cvplus (default: bayit)
  --max-iterations <n>   Max agent iterations (default: 20)
  --budget <amount>      Max cost in USD (default: 0.50)
```

**Examples:**

```bash
# Upload content
olorin ai "upload all series from usb starting with family ties"

# Search and update
olorin ai "find series about jewish holidays and update missing posters"

# Get statistics
olorin ai "get content library stats for this month"

# Dry run mode (preview only)
olorin ai "delete all duplicates" --dry-run
```

#### 2. Semantic Search

```bash
olorin ai search "jewish holiday content for kids" [options]

# Options
  -t, --type <type>    Filter by type: series, movies, podcasts, radio, all (default: all)
  -l, --limit <limit>  Max results (default: 20)
  --no-rerank          Disable semantic re-ranking
  --json               Output as JSON
```

**Examples:**

```bash
# Search all content
olorin ai search "educational science content"

# Filter by type
olorin ai search "comedy series" --type series --limit 10

# JSON output
olorin ai search "kids podcasts" --json
```

#### 3. Voice Commands

```bash
olorin ai voice [options]

# Options
  --platform <platform>  Target platform (default: bayit)
  --language <lang>      Language code: en, he, es (default: en)
  --dry-run              Preview without executing
```

**Note:** Voice recording requires additional microphone integration (coming soon).

#### 4. Health Check

```bash
olorin ai health
```

Check NLP service status and feature availability.

## Configuration

### Environment Variables

```bash
# Backend URL (default: http://localhost:8090)
export OLORIN_BACKEND_URL=http://localhost:8090

# Enable NLP features on backend
export OLORIN_NLP_ENABLED=true

# Anthropic API key (required for NLP)
export ANTHROPIC_API_KEY=sk-ant-...
```

### Backend Setup

NLP features require the backend server to be running with NLP enabled:

```bash
cd backend

# Add to .env
OLORIN_NLP_ENABLED=true
ANTHROPIC_API_KEY=sk-ant-...

# Start backend
poetry run uvicorn app.main:app --reload
```

## Architecture

### Components

```
cli/src/
├── commands/
│   └── ai.ts              # AI command handlers
├── services/
│   └── nlp-client.ts      # Backend API client
└── index.ts               # Main entry point
```

### Request Flow

```
CLI Command
    ↓
NLP Client (TypeScript)
    ↓
HTTP Request → Backend API (/api/v1/nlp/*)
    ↓
NLP Services (Python)
    ↓
Claude Sonnet 4.5 (Agent Execution)
    ↓
Tool Dispatcher (execute tools)
    ↓
Platform Services (Bayit+, Fraud, CV Plus)
```

## Examples

### Agent Workflow Example

```bash
# Complex multi-step workflow
olorin ai "find all series without posters, search TMDB for artwork, and update them"

# Output:
# ✔ Agent execution complete
#
# 📋 Execution Summary:
# Found 12 series without posters. Successfully updated 10 series with TMDB artwork.
# 2 series require manual review.
#
# 🔧 Tool Calls:
#   1. search_bayit_content
#      Input: {"query": "series without posters"}
#      Output: Found 12 items
#   2. web_search
#      Input: {"query": "TMDB API artwork"}
#      Output: Found 5 results
#   3. update_content_metadata (x10)
#      Input: {"content_id": "...", "updates": {"poster_url": "..."}}
#      Output: Successfully updated
#
# 📊 Statistics:
#   Iterations: 15
#   Total cost: $0.0842
```

### Search Example

```bash
olorin ai search "jewish holiday content for kids"

# Output:
# 🔍 Search Results for: "jewish holiday content for kids"
# Found 15 items
#
# 1. Hanukkah Songs for Kids
#    Type: series
#    Relevance: ██████████ 95%
#    Educational songs about Hanukkah traditions and history
#
# 2. Jewish Holidays Explained
#    Type: podcast
#    Relevance: ████████░░ 87%
#    Kid-friendly explanations of Jewish holidays throughout the year
```

## Error Handling

### Common Errors

**Backend not running:**
```
❌ Error: fetch failed

💡 Backend server not running:
   Start backend: cd backend && poetry run uvicorn app.main:app --reload
```

**NLP disabled:**
```
❌ Error: NLP features are disabled

💡 To enable NLP features:
   1. Set OLORIN_NLP_ENABLED=true in backend/.env
   2. Set ANTHROPIC_API_KEY in backend/.env
   3. Restart backend server
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Lint

```bash
npm run lint
```

## API Reference

See backend API documentation:
- `/api/v1/nlp/parse-command` - Parse natural language
- `/api/v1/nlp/execute-agent` - Execute agent workflow
- `/api/v1/nlp/search-content` - Semantic search
- `/api/v1/nlp/voice-command` - Voice commands
- `/api/v1/nlp/health` - Health check

## Cost Tracking

Agent execution tracks API costs:
- Input tokens: $3.00 / million tokens
- Output tokens: $15.00 / million tokens

Default limits:
- Max cost per query: $0.10
- Max agent budget: $0.50 per workflow

## Security

- All destructive operations require confirmation
- Dry-run mode available for all commands
- API keys stored in environment variables
- No credentials in command history

## Roadmap

- [ ] Voice recording integration (microphone support)
- [ ] MCP client integration
- [ ] Bash interactive mode integration
- [ ] USB drive auto-detection
- [ ] Cost analytics and budgeting
- [ ] Command history and favorites
