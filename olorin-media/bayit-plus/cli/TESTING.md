# NLP CLI Testing & Verification Guide

This document provides comprehensive testing and verification procedures for the NLP-powered Olorin CLI.

## Table of Contents

1. [Backend Tests](#backend-tests)
2. [CLI Tests](#cli-tests)
3. [Integration Verification](#integration-verification)
4. [Manual Testing Scenarios](#manual-testing-scenarios)
5. [Performance Verification](#performance-verification)

---

## Backend Tests

### Running Backend Tests

```bash
cd backend

# Run all NLP tests
poetry run pytest tests/test_nlp_*.py -v

# Run with coverage
poetry run pytest tests/test_nlp_*.py --cov=app/services/nlp --cov-report=html

# Run specific test file
poetry run pytest tests/test_nlp_intent_parser.py -v
```

### Test Coverage

**Target**: 87%+ coverage for NLP services

**Test Files**:
- `test_nlp_intent_parser.py` - Intent parsing and command understanding
- `test_nlp_semantic_search.py` - Semantic search with MongoDB
- `test_nlp_agent_executor.py` - Multi-step agent workflows
- `test_nlp_tool_dispatcher.py` - Tool execution and routing

**Coverage Report**:
```bash
poetry run pytest tests/test_nlp_*.py --cov=app/services/nlp --cov-report=term-missing
```

---

## CLI Tests

### Running CLI Tests

```bash
cd cli

# Install test dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Files

- `tests/nlp-types.test.ts` - Type definitions validation
- `tests/mcp-config.test.ts` - MCP configuration loading

---

## Integration Verification

### 1. Backend API Health Check

```bash
# Start backend
cd backend && poetry run uvicorn app.main:app --reload --port 8090

# Test NLP endpoints
curl -X POST http://localhost:8090/api/v1/nlp/parse-command \
  -H "Content-Type: application/json" \
  -d '{"query": "upload family ties from usb", "context": {}}'

# Expected response:
# {
#   "intent": "upload_series",
#   "confidence": 0.95,
#   "params": {"series": "family ties", "source": "usb"},
#   "requires_confirmation": true
# }
```

### 2. CLI Commands

```bash
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus

# Build CLI
cd cli && npm run build

# Test MCP list
./cli/bin/olorin.js mcp list

# Test AI help
./cli/bin/olorin.js ai --help

# Test with dry-run (requires backend running)
export OLORIN_BACKEND_URL=http://localhost:8090
./cli/bin/olorin.js ai ask "check status of backend" --dry-run
```

### 3. Bash Integration

```bash
# Set NLP environment variables
export OLORIN_NLP_ENABLED=true
export ANTHROPIC_API_KEY=your_key_here
export OLORIN_BACKEND_URL=http://localhost:8090

# Start interactive mode
./scripts/olorin-interactive.sh

# In interactive mode:
olorin> status backend
olorin> help
olorin> exit
```

---

## Manual Testing Scenarios

### Scenario 1: Parse Upload Command

**Test**: Validate intent parsing for content upload

```bash
# Backend must be running with ANTHROPIC_API_KEY set

curl -X POST http://localhost:8090/api/v1/nlp/parse-command \
  -H "Content-Type: application/json" \
  -d '{
    "query": "upload all series from usb starting with family ties season 2",
    "context": {"platform": "bayit"}
  }'
```

**Expected**:
- Intent: `upload_series`
- Confidence: > 0.7
- Params include: `series`, `season`, `source`
- `requires_confirmation`: true

### Scenario 2: Semantic Search

**Test**: Search content using natural language

```bash
curl -X POST http://localhost:8090/api/v1/nlp/search-content \
  -H "Content-Type: application/json" \
  -d '{
    "query": "jewish holiday content for kids",
    "content_type": "all",
    "limit": 10,
    "rerank": true
  }'
```

**Expected**:
- Returns content items matching query
- Results sorted by relevance score
- Includes match reasons

### Scenario 3: Agent Execution (Dry-Run)

**Test**: Multi-step workflow execution

```bash
curl -X POST http://localhost:8090/api/v1/nlp/execute-agent \
  -H "Content-Type": application/json" \
  -d '{
    "query": "search for family ties and show me the first result",
    "platform": "bayit",
    "dry_run": true,
    "max_iterations": 10,
    "budget_limit": 0.50
  }'
```

**Expected**:
- Success: true
- Tool calls executed
- Total cost calculated
- Summary provided

### Scenario 4: MCP Server Interaction

**Test**: Connect to MCP server and list tools

```bash
# Start backend (includes MCP server)
cd backend && poetry run uvicorn app.main:app --reload

# In another terminal, test MCP
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus
./cli/bin/olorin.js mcp list
./cli/bin/olorin.js mcp health bayit-content
```

**Expected**:
- Lists configured servers
- Health check passes
- Can list tools from server

---

## Performance Verification

### 1. Response Time

**Intent Parsing**: < 2 seconds
**Semantic Search**: < 3 seconds
**Agent Execution**: < 10 seconds (depends on iterations)

### 2. Cost Tracking

Monitor API costs:

```bash
# Check cost for single query
# Expected: $0.001 - $0.10 per query (default limit: $0.10)
```

### 3. Rate Limiting

Verify rate limits are enforced:

```bash
# Make 15 requests in 1 minute
# Expected: 10 pass, 5 fail with rate limit error
```

---

## Troubleshooting

### Backend Tests Fail

**Issue**: Import errors or module not found

**Solution**:
```bash
cd backend
poetry install  # Reinstall dependencies
export PYTHONPATH=$PWD  # Set Python path
```

### CLI Tests Fail

**Issue**: ESM module errors

**Solution**:
```bash
cd cli
npm install  # Reinstall dependencies
npm run build  # Rebuild TypeScript
```

### API Connection Errors

**Issue**: Cannot connect to backend

**Solution**:
```bash
# Verify backend is running
curl http://localhost:8090/health

# Check environment variables
echo $OLORIN_BACKEND_URL
echo $ANTHROPIC_API_KEY
```

### MCP Server Errors

**Issue**: MCP server not accessible

**Solution**:
```bash
# Check .mcp.json exists
ls -la .mcp.json

# Verify MongoDB connection
echo $MONGODB_URL

# Test MCP server directly
node backend/app/mcp_server/server.js
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: NLP CLI Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install poetry
          poetry install
      - name: Run tests
        run: |
          cd backend
          poetry run pytest tests/test_nlp_*.py --cov
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

  cli-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: |
          cd cli
          npm install
      - name: Run tests
        run: |
          cd cli
          npm test
```

---

## Coverage Goals

- **Backend NLP Services**: 87%+ (required)
- **CLI Services**: 70%+ (recommended)
- **Integration Tests**: All critical paths covered

## Next Steps

1. Run full test suite: `./scripts/run-all-tests.sh`
2. Generate coverage reports
3. Review failed tests and fix issues
4. Document additional test scenarios
5. Set up CI/CD pipeline

---

**Last Updated**: 2026-01-26
**Version**: Phase 5 - Testing & Validation
