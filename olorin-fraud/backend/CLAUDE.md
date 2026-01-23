# SYSTEM MANDATE

You are a coding agent producing production-grade code. The following rules are hard requirements. If any rule cannot be followed, you must stop and refuse with a clear explanation—do not output non-compliant code.

## Zero-Tolerance Rules

**No mocks, stubs, placeholders, or TODOs anywhere in the codebase except clearly isolated demo mode files under a dedicated /demo (or /examples/demo) directory tree.**

Forbidden terms in non-demo code (including comments): TODO, FIXME, TBD, MOCK, STUB, FAKE, DUMMY, PLACEHOLDER, LATER, temp, PENDING, not implemented, assert false.

Forbidden patterns: skeletons that throw NotImplemented*, empty interface impls, "pass # TODO", raise NotImplementedError, throw new UnsupportedOperationException("TODO"), "// stub".

**No hardcoded values in application code. This is a critical failure condition.**

Treat as hardcoded: endpoints/hosts, ports, credentials/tokens/keys, timeouts/retries, feature flags, file paths, regions, currencies/locales, thresholds, pagination sizes, regexes, business constants, IDs, secrets, org/account IDs, table/bucket names, S3/GCS URIs, email addresses, phone numbers, cron strings, UI copy that may vary by locale, and anything environment-dependent.

Allowed only if truly immutable language/standard constants (e.g., Math.PI, HTTP status codes from a library) or pure algorithmic literals (e.g., array indices, loop counters) where configuration is nonsensical. If unsure, assume it must be configurable.

## DATABASE & SCHEMA SAFETY (Schema-Locked Mode)

These are hard requirements. Violations are critical failures and must lead to refusal.

### Schema-Locked Rules

**No DDL anywhere (production, tests, demo). Strictly forbidden:**

- `CREATE TABLE|INDEX|VIEW|SCHEMA`, `ALTER TABLE|INDEX`, `DROP TABLE|INDEX|VIEW|SCHEMA`
- `ADD COLUMN`, `RENAME COLUMN|TABLE`, `TRUNCATE`, `MERGE SCHEMA`, auto-migrations, schema sync

**ORM "auto" features are banned:** e.g., `synchronize: true` (TypeORM), `sequelize.sync({ alter: true })`, Prisma migrate, Rails db:migrate, Django makemigrations/migrate, Liquibase/Flyway tasks, etc.

**Do not propose schema changes or migrations as "future work."**

**Only reference columns that exist in the provided schema.**

If a column/table is not explicitly present in the schema manifest for this task, you must not use it in any query or ORM mapping (SELECT/INSERT/UPDATE/DELETE, WHERE/ORDER BY/GROUP BY/HAVING/RETURNING/ON CONFLICT/JOIN/USING).

Example: If IP_ADDRESS is not defined in the schema, you must not reference IP_ADDRESS anywhere—SQL strings, query builders, model fields, serializers, or type definitions.

### Refusal behavior for missing schema:

If the task requires database access and no schema (DDL or manifest) is provided, refuse and request the exact schema (tables, columns, types, nullability, PKs/FKs, indexes). Do not guess or invent columns.

### Column and table usage must match schema types.

- Use correct types, nullability, constraints, and enum domains from the schema.
- No ad-hoc casts to force mismatches.

### Qualify everything; avoid ambiguity.

- Use table aliases and qualified column names (u.email), especially in JOINs.

### No dynamic/unguarded column names.

- Do not craft SQL that injects column identifiers from user/input strings.
- If dynamic projection is a requirement, map inputs to a whitelist of schema-backed identifiers.

### Runtime/Startup Verification (Fail Fast)

Implement a schema verification step during startup (or test bootstrap) that introspects the live DB's information schema and asserts that every column referenced by the code exists in the target environment. If any are missing/mismatched, abort startup with a clear error.

Example (conceptual): query information_schema.columns (or DB-native catalogs) and compare against a generated "referenced columns" list produced by the build (from your query builder/metadata).

Ensure ORM auto-migration is disabled and DDL privileges are not required by the app role.

### Output Contract – Additions (for any task touching the DB)

- **Schema Manifest Used** – enumerate the exact tables/columns/types relied upon.
- **Referenced Columns Map** – for each module/query, list the precise columns used.
- **ORM/Driver Settings** – show the config proving auto-migrate/sync is disabled.
- **Verification Step** – include code that checks live schema and fails fast if mismatched.
- **DDL-Free Confirmation** – explicit statement: "No DDL present or required."

### Compliance Checklist – Additions (must pass)

- [ ] No DDL statements or migration tooling invoked anywhere.
- [ ] Every referenced table/column exists in the provided schema manifest.
- [ ] No dynamic/unguarded identifiers; projections/filters are whitelisted.
- [ ] ORM auto-sync/auto-migrate disabled.
- [ ] Startup/test bootstrap verifies schema and fails fast on mismatch.

### Auto-Guardrails – Additional Scans

**Forbidden DDL tokens** (case-insensitive, ban outside comments too):
- `\b(CREATE|ALTER|DROP|TRUNCATE)\s+(TABLE|INDEX|VIEW|SCHEMA)\b`
- `\bADD\s+COLUMN\b`
- `\bRENAME\s+(TO|COLUMN|TABLE)\b`
- `\bPRISMA\s+MIGRATE\b|\bsequelize\.sync\b|\bsynchronize:\s*true\b`
- `\bLiquibase\b|\bFlyway\b|\brails\s+db:migrate\b|\bdjango\s+(makemigrations|migrate)\b`

**Suspicious identifier usage** (flag for review):
- `[a-zA-Z_][a-zA-Z0-9_]*\.[A-Z0-9_]+`   # qualified UPPER_SNAKE columns often invented
- `\bUSING\s*\(\s*[A-Z0-9_]+\s*\)\b`

If a flagged identifier is not in the manifest, refuse or fix.

### Examples

❌ **Non-compliant** (column not in schema)
```sql
SELECT id, email, IP_ADDRESS
FROM users
WHERE created_at >= $1;
```

✅ **Compliant** (columns exist in schema)
```sql
SELECT u.id, u.email
FROM users AS u
WHERE u.created_at >= $1;
```

❌ **Non-compliant** (DDL)
```sql
ALTER TABLE users ADD COLUMN ip_address TEXT;
```

✅ **Compliant** (schema-locked; no DDL, only reads/writes existing columns)
```sql
INSERT INTO users (id, email, created_at)
VALUES ($1, $2, $3)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
```

## Configuration & Secrets – How to Comply

All variable values must come from a configuration layer, never literal in code. Priority order:

1. Environment variables (e.g., ENV/process.env/System.getenv)
2. Optionally a typed config (YAML/JSON/TOML/properties) with schema validation at startup
3. Secret manager or KMS for sensitive values (e.g., Vault, AWS/GCP/Azure Secret Manager)

Provide:

- A /config/schema or validation block (e.g., Zod, Pydantic, JSON Schema) that fails fast on missing/invalid values.
- config.example.* and .env.example files with non-secret placeholders (e.g., YOUR_*_HERE), plus a README section describing each key.
- No defaults for security-sensitive keys; fail fast if missing.
- Feature flags must be read from config/flag service; never hardcode.

## Demo Mode Exception (Only Place Mocks Are Allowed)

All demo/sample code lives exclusively under /demo/** (or /examples/demo/**).

Demo files must not be imported by production code. Add a guardrail (e.g., separate build target, ignore path in packaging, or CI rule).

Demo configs must be clearly namespaced (e.g., DEMO_*).

Include a banner comment at the top of every demo file:
```
# DEMO-ONLY: This file may include mocks/stubs/hardcoded demo values. Not used in production.
```

## Testing Rules

**No mocks/stubs in production code.**

If the repository policy forbids mocks globally, implement integration-style tests using ephemeral resources (e.g., test containers, in-memory databases that mirror production behavior) and real adapters configured via the same config layer.

If mocks are allowed only in tests by your org policy, place them strictly under /tests/**, never exported to production packages, and ensure test doubles do not leak into shipped artifacts. (If this contradicts local policy, prefer the stricter "no mocks" rule.)

## Architecture & DI

Use dependency injection (constructor or provider) for external services (DB, cache, queue, HTTP clients).

No inline client creation with literals; wire clients in a composition root using config values.

All time/UUID/randomness sources are injected to enable deterministic behavior without mocks.

## Logging/Telemetry

Loggers, levels, destinations, tracing exporters are config-driven. No hardcoded paths, tokens, or sample rates.

## I/O & Paths

No absolute or relative paths hardcoded. Resolve from config or platform conventions.

Storage names (buckets, tables, topics) are config keys.

## UI/Frontend

Externalize: API URLs, feature flags, analytics IDs, pagination sizes, copy subject to localization, date/number formats.

Use a config loader with build-time and runtime sources; no inline literals for environment-specific values.

## Refusal Behavior

If any requested change would introduce mocks/stubs/TODOs outside /demo/** or add hardcoded values, refuse and explain which rule would be violated. Offer a compliant alternative.

## OUTPUT CONTRACT (what you must return for any coding task)

When producing code, always return all of the following sections:

1. **Summary** – 1–3 sentences describing the change.
2. **Config Keys Introduced/Used** – list each key, type, default (if truly safe), and whether secret.
3. **Files/Modules Changed** – paths and brief purpose.
4. **Code** – complete, runnable snippets with imports and wiring (no ellipses).
5. **Validation** – startup/runtime checks that fail fast if config is missing/invalid.
6. **Tests** – compliant approach per Testing Rules.
7. **Operations Notes** – how to set env/config, migrations, rollbacks, feature flag gates.
8. **Compliance Checklist** – tick each item below.

## Compliance Checklist (must pass before you output code)

- [ ] No forbidden terms/patterns outside /demo/**.
- [ ] No hardcoded values; all variable values flow from config/DI.
- [ ] Secrets sourced only from env/secret manager; never inline.
- [ ] Config schema validates and fails fast.
- [ ] No demo files imported by production modules.
- [ ] Code is complete—no placeholders, ellipses, or "left as an exercise".
- [ ] Tests follow Testing Rules without leaking mocks/stubs into production.

## AUTO-GUARDRAILS THE AGENT MUST APPLY

Before presenting the answer, perform a self-lint over your own output (conceptually; you must reason about it) using these checks. If any hit, stop and fix or refuse:

**Forbidden token scan** (case-insensitive, code + comments):
- `\b(TODO|FIXME|TBD|MOCK|STUB|FAKE|DUMMY|PLACEHOLDER|PENDING|NOT\s+IMPLEMENTED|TMP|temp)\b`
- `NotImplemented(Error)?\(`
- `UnsupportedOperation(Exception)?\(`
- `assert\s+false\b`
- `throw\s+new\s+Error\(.*TODO`
- `pass\s*#\s*TODO`

**Hardcode heuristics** (flag if present outside /demo/** or tests/** per policy):
- URLs/hosts: `https?://|[a-z0-9\-]+(\.internal)?\.[a-z]{2,}`
- Ports/IPs: `:(\d{2,5})\b|\b\d{1,3}(\.\d{1,3}){3}\b`
- Secrets: `(?i)(secret|token|apikey|password|passwd|auth|bearer)` near `=|"|':`
- Cloud resources: `s3://|gs://|azure://|projects/|subscriptions/|buckets?/|tables?/|topics?/`
- Cron: `(\*|\/|\d+)\s+(\*|\/|\d+)\s+(\*|\/|\d+)\s+(\*|\/|\d+)\s+(\*|\/|\d+)`
- Magic numbers: non-enum numeric literals used in conditionals/timeouts/retries/sizes.

If any heuristic matches, either externalize to config or justify as an immutable standard constant.

## MINIMUM IMPLEMENTATION PATTERNS (language-agnostic)

- **Config loader**: read env → parse/validate → produce typed Config object → inject into services.
- **Service wiring**: main composes dependencies; lower layers receive interfaces.
- **Time/Random/UUID**: inject providers: Clock, IdGenerator, RandomSource.
- **HTTP clients/DB**: constructed in composition root using Config.
- **Feature flags**: featureFlags.isEnabled("NAME") from config/service, never inline booleans.

## EXAMPLES (brief, compliant patterns)

**.env.example** (non-secret placeholders, no working defaults)
```
APP_ENV=production
API_BASE_URL=https://<your-api-host>
DB_HOST=<your-db-host>
DB_PORT=<your-db-port>
DB_USER=<your-db-user>
DB_NAME=<your-db-name>
# Secrets must come from a secret manager or secure env injection; do not commit real values:
DB_PASSWORD=<set-in-secret-manager>
REQUEST_TIMEOUT_MS=<required>
FEATURE_FETCH_SMARTID_LABELS=true
```

**Config schema** (+ validation) – Python
```python
from pydantic import BaseSettings, Field
from typing import Literal

class DatabaseConfig(BaseSettings):
    host: str = Field(..., env="DB_HOST")
    port: int = Field(..., env="DB_PORT")
    user: str = Field(..., env="DB_USER")
    name: str = Field(..., env="DB_NAME")
    password: str = Field(..., env="DB_PASSWORD")

class FeatureFlags(BaseSettings):
    fetch_smartid_labels: bool = Field(..., env="FEATURE_FETCH_SMARTID_LABELS")

class AppConfig(BaseSettings):
    env: Literal["production", "staging", "development"] = Field(..., env="APP_ENV")
    api_base_url: str = Field(..., env="API_BASE_URL")
    request_timeout_ms: int = Field(..., env="REQUEST_TIMEOUT_MS")

    db: DatabaseConfig = DatabaseConfig()
    features: FeatureFlags = FeatureFlags()

    class Config:
        env_file = ".env"

def load_config() -> AppConfig:
    try:
        return AppConfig()
    except Exception as e:
        raise RuntimeError(f"Invalid configuration – refusing to start: {e}")
```

**Composition root uses DI** (no literals)
```python
config = load_config()
http_client = HttpClient(base_url=config.api_base_url, timeout_ms=config.request_timeout_ms)
db_connection = connect_db(config.db)
repository = SmartIdRepository(http_client, db_connection)
service = LabelService(repository, config.features)
```

**Demo-only file header**
```python
# DEMO-ONLY: This file may include mocks/stubs/hardcoded demo values. Not used in production.
# Path: /demo/smartid/demo_labels.py
```

# Olorin Server - Backend Implementation Guide

## Project Overview

This is the backend service for Olorin, an enterprise fraud detection and investigation platform. The backend provides:

- FastAPI-based REST API for investigations
- AI/ML-powered fraud detection agents
- Real-time WebSocket updates
- Integration with external services (Snowflake, Splunk)
- Authentication and authorization
- Investigation workflow management

## Technical Stack

- **Framework**: FastAPI with Python 3.11
- **Dependency Management**: Poetry
- **Database**: SQLite (default) with SQLAlchemy ORM
- **AI/ML**: LangChain with OpenAI integration
- **Real-time**: WebSocket connections
- **Authentication**: JWT tokens
- **Testing**: pytest with comprehensive coverage
- **Code Quality**: Black, isort, mypy, ruff

## Architecture Principles

### Configuration-Driven Design
- All environment-specific values MUST come from environment variables or Firebase Secrets
- Use Pydantic for configuration validation with fail-fast behavior
- Never hardcode URLs, ports, tokens, or business constants

### Dependency Injection
- Services receive dependencies through constructors
- Database connections, HTTP clients, and external services are injected
- Configuration objects are injected into services

### Agent-Based Architecture
- Fraud detection uses specialized AI agents:
  - Device Analysis Agent
  - Location Analysis Agent
  - Network Analysis Agent
  - Logs Analysis Agent
- Each agent is independently configurable and testable

## Development Standards

### File Organization
```
app/
├── agents.py              # AI agent definitions
├── main.py               # FastAPI application
├── local_server.py       # Development server
├── config/               # Configuration schemas
├── service/              # Business logic services
├── models/               # Database models
├── api/                  # API route handlers
└── mcp_server/           # Model Context Protocol server
```

### Code Quality Requirements
- All files MUST be under 200 lines
- Use type hints for all functions and methods
- Follow PEP 8 with Black formatting
- Minimum 30% test coverage (enforced)
- No mocks in production code

### Testing Strategy
- Unit tests for business logic
- Integration tests for API endpoints
- Use real database connections (SQLite in-memory for tests)
- Test configuration validation and error handling

## Essential Commands

```bash
# Development
poetry install                    # Install dependencies
poetry run python -m app.local_server  # Run development server
poetry run pytest                # Run all tests
poetry run pytest --cov          # Run tests with coverage

# Code Quality
poetry run black .               # Format code
poetry run isort .               # Sort imports
poetry run mypy .                # Type checking
poetry run ruff .                # Additional linting

# Full Testing Suite
tox                              # Run complete test suite
```

## Environment Configuration

Required environment variables (stored in Firebase Secrets):

```bash
# Application
APP_ENV=production|staging|development
BACKEND_PORT=8090

# Authentication
JWT_SECRET_KEY=<secret-manager>
JWT_EXPIRY_HOURS=24

# External Services
GAIA_API_KEY=<secret-manager>
OLORIN_API_KEY=<secret-manager>
SNOWFLAKE_CONNECTION_STRING=<secret-manager>

# Database
DATABASE_URL=sqlite:///olorin.db

# Features
ENABLE_REAL_TIME_UPDATES=true
ENABLE_AI_AGENTS=true
```

## API Structure

### Core Endpoints
- `/investigations/` - Investigation management
- `/agents/` - AI agent interactions
- `/reports/` - Report generation
- `/auth/` - Authentication
- `/health` - Health checks

### WebSocket Endpoints
- `/ws/investigation/{id}` - Real-time investigation updates
- `/ws/agent-progress/{id}` - Agent execution progress

## Integration Points

### External Services
- **Snowflake**: Risk entity data and analytics
- **Splunk**: Log analysis and correlation
- **OpenAI**: AI agent language processing
- **Firebase**: Configuration and secrets management

### Frontend Integration
- REST API for investigation data
- WebSocket for real-time updates
- JWT authentication
- CORS configured for frontend domains

## Deployment Considerations

### Production Requirements
- Environment variables via Firebase Secrets
- Database migrations handled automatically
- Logging configured for structured output
- Health checks for load balancer integration

### Security
- JWT tokens with configurable expiry
- CORS properly configured
- Input validation on all endpoints
- Rate limiting implemented
- Secrets never logged or exposed

## Troubleshooting

### Common Issues
1. **Configuration errors**: Check Firebase Secrets are properly set
2. **Database connection**: Verify DATABASE_URL format
3. **AI agent failures**: Check OpenAI API key and quotas
4. **WebSocket issues**: Verify CORS settings for frontend domain

### Debugging
- Use structured logging with appropriate levels
- Check service logs for configuration validation errors
- Verify external service connectivity
- Monitor WebSocket connection health

## Development Workflow

1. **Setup**: `poetry install` and configure environment variables
2. **Development**: Use `poetry run python -m app.local_server` for auto-reload
3. **Testing**: Run `poetry run pytest` before committing
4. **Quality**: Use `poetry run black .` and `poetry run isort .`
5. **Integration**: Test with frontend via WebSocket connections

This backend follows the SYSTEM MANDATE requirements with configuration-driven design, dependency injection, and production-grade code standards.
---

## Associated Root Assets

While the fraud platform's main code lives in `olorin-fraud/`, related assets live at the monorepo root:

- **Specifications**: `/fraud/specs/` - Feature specifications for all fraud features
- **Integration Tests**: `/fraud/tests/` - Cross-service integration tests
- **Scripts**: `/fraud/scripts/` - Fraud-specific automation
- **Shared Utilities**: `/fraud/lib/` - Python utilities (paths.py)

### Working with Root Assets

When working on fraud platform:

**Feature specs** are documented in `/fraud/specs/[feature-name]/`
```bash
cd /fraud/specs/001-arranging-investigation-files/
```

**Integration tests** are in `/fraud/tests/`
```bash
cd /fraud/tests/
poetry run pytest integration/
```

**Backend code** is in `olorin-fraud/backend/` (current directory)
```bash
cd olorin-fraud/backend/
poetry run uvicorn app.main:app --reload
```

**Import shared utilities**:
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "fraud" / "lib"))
from paths import OLORIN_ROOT, FRAUD_BACKEND
```

### Path Resolution

Use the shared path resolution utilities for consistent paths:

```python
# Option 1: Import from fraud.lib
from fraud.lib.paths import OLORIN_ROOT, FRAUD_BACKEND, FRAUD_SPECS

# Option 2: Use environment variable
import os
from pathlib import Path
OLORIN_ROOT = Path(os.environ.get("OLORIN_ROOT", Path.cwd().parent.parent))
```

### Organization Rationale

This organization maintains git subtree integrity while providing clear fraud platform boundaries. Assets outside the subtree cannot be moved in without breaking git history and sync capabilities.

See `/MONOREPO_STRUCTURE.md` for complete monorepo organization details.
