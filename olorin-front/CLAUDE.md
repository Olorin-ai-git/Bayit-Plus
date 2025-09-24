# SYSTEM MANDATE

You are a coding agent producing production-grade code. The following rules are hard requirements. If any rule cannot be followed, you must stop and refuse with a clear explanation—do not output non-compliant code.

## Zero-Tolerance Rules

**No mocks, stubs, placeholders, or TODOs anywhere in the codebase except clearly isolated demo mode files under a dedicated /demo (or /examples/demo) directory tree.**

Forbidden terms in non-demo code (including comments): TODO, FIXME, TBD, MOCK, STUB, FAKE, DUMMY, PLACEHOLDER, LATER, temp, PENDING, not implemented, assert false.

Forbidden patterns: skeletons that throw NotImplemented*, empty interface impls, "pass # TODO", raise NotImplementedError, throw new UnsupportedOperationException("TODO"), "// stub".

**No hardcoded values in application code. This is a critical failure condition.**

Treat as hardcoded: endpoints/hosts, ports, credentials/tokens/keys, timeouts/retries, feature flags, file paths, regions, currencies/locales, thresholds, pagination sizes, regexes, business constants, IDs, secrets, org/account IDs, table/bucket names, S3/GCS URIs, email addresses, phone numbers, cron strings, UI copy that may vary by locale, and anything environment-dependent.

Allowed only if truly immutable language/standard constants (e.g., Math.PI, HTTP status codes from a library) or pure algorithmic literals (e.g., array indices, loop counters) where configuration is nonsensical. If unsure, assume it must be configurable.

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
// DEMO-ONLY: This file may include mocks/stubs/hardcoded demo values. Not used in production.
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
REACT_APP_ENV=production
REACT_APP_API_BASE_URL=https://<your-api-host>
REACT_APP_WS_BASE_URL=wss://<your-ws-host>
REACT_APP_FRONTEND_PORT=<required>
# Secrets must come from a secret manager or secure env injection; do not commit real values:
REACT_APP_AUTH_TOKEN=<set-in-secret-manager>
REACT_APP_FEATURE_ENABLE_RAG=true
REACT_APP_PAGINATION_SIZE=<required>
```

**Config schema** (+ validation) – TypeScript
```typescript
import * as z from "zod";

export const ConfigSchema = z.object({
  env: z.enum(["production","staging","development"]),
  apiBaseUrl: z.string().url(),
  wsBaseUrl: z.string().url(),
  frontendPort: z.coerce.number().int().positive(),
  authToken: z.string().min(1),
  features: z.object({
    enableRag: z.coerce.boolean(),
    enableRealTimeUpdates: z.coerce.boolean()
  }),
  ui: z.object({
    paginationSize: z.coerce.number().int().positive(),
    requestTimeoutMs: z.coerce.number().int().positive()
  })
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): AppConfig {
  const parsed = ConfigSchema.safeParse({
    env: process.env.REACT_APP_ENV,
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
    wsBaseUrl: process.env.REACT_APP_WS_BASE_URL,
    frontendPort: process.env.REACT_APP_FRONTEND_PORT,
    authToken: process.env.REACT_APP_AUTH_TOKEN,
    features: {
      enableRag: process.env.REACT_APP_FEATURE_ENABLE_RAG,
      enableRealTimeUpdates: process.env.REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES
    },
    ui: {
      paginationSize: process.env.REACT_APP_PAGINATION_SIZE,
      requestTimeoutMs: process.env.REACT_APP_REQUEST_TIMEOUT_MS
    }
  });
  if (!parsed.success) {
    console.error(parsed.error.format());
    throw new Error("Invalid configuration – refusing to start.");
  }
  return parsed.data;
}
```

**Composition root uses DI** (no literals)
```typescript
const config = loadConfig();
const httpClient = new HttpClient({ baseUrl: config.apiBaseUrl, timeoutMs: config.ui.requestTimeoutMs });
const wsClient = new WebSocketClient({ baseUrl: config.wsBaseUrl });
const apiService = new ApiService(httpClient, config.authToken);
const investigationService = new InvestigationService(apiService, wsClient, config.features);
```

**Demo-only file header**
```typescript
// DEMO-ONLY: This file may include mocks/stubs/hardcoded demo values. Not used in production.
// Path: /demo/investigations/demo-data.ts
```

# Olorin Frontend - React Application Implementation Guide

## 🚧 CRITICAL: ACTIVE REFACTORING IN PROGRESS

**Current Branch**: `001-refactoring-the-frontend`
**Status**: Major architectural migration from Material-UI to Tailwind CSS with microservices architecture

### ⚠️ MANDATORY REFACTORING REQUIREMENTS

**ZERO TOLERANCE RULES FOR CURRENT REFACTORING**:
1. **NO Material-UI**: Absolutely NO imports from `@mui/material`, `@mui/icons-material`, or `styled-components`
2. **ONLY Tailwind CSS**: All styling MUST use Tailwind CSS classes and custom Headless UI components
3. **200-Line Limit**: Every `.tsx/.ts` file MUST be under 200 lines (19 files currently over limit)
4. **Microservices Architecture**: Each service must be independently deployable

## Project Overview

Olorin Frontend is a React TypeScript application for enterprise fraud detection and investigation. Currently undergoing major refactoring to:

- **Remove Material-UI**: Complete migration to Tailwind CSS
- **Implement Microservices**: Split monolith into 6 independent services
- **File Size Compliance**: Break down oversized files into compliant modules
- **Module Federation**: Enable runtime composition of services

## Technical Stack (Post-Refactoring)

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS (NO Material-UI)
- **Architecture**: Microservices with Webpack 5 Module Federation
- **State Management**: React hooks and context
- **Build System**: Webpack 5 with Module Federation
- **Testing**: Jest with React Testing Library
- **Code Quality**: ESLint, Prettier, TypeScript strict mode

## Microservices Architecture

### 6 Independent Services:

1. **Investigation Service** (Port 3001)
   - Core investigation functionality
   - Investigation dashboard and workflows
   - Case management

2. **Agent Analytics Service** (Port 3002)
   - AI agent monitoring and logs
   - Agent performance metrics
   - Real-time agent status

3. **RAG Intelligence Service** (Port 3003)
   - Retrieval-augmented generation
   - Knowledge base interactions
   - Intelligent search

4. **Visualization Service** (Port 3004)
   - Graphs, charts, and maps
   - Data visualization components
   - Interactive dashboards

5. **Reporting Service** (Port 3005)
   - PDF generation and exports
   - Report templates
   - Document management

6. **Core UI Service** (Port 3006)
   - Shared components and authentication
   - Navigation and layout
   - Common UI elements

## Development Commands (Refactored)

### Microservices Development
```bash
# Individual services
npm run dev:shell                    # Main shell app (port 3000)
npm run dev:investigation            # Investigation service (port 3001)
npm run dev:agent-analytics          # Agent analytics service (port 3002)
npm run dev:rag-intelligence         # RAG intelligence service (port 3003)
npm run dev:visualization            # Visualization service (port 3004)
npm run dev:reporting                # Reporting service (port 3005)
npm run dev:core-ui                  # Core UI service (port 3006)

# All services together
npm run dev:all-services             # Start all microservices

# Legacy (DEPRECATED - will be removed)
npm start                            # Single React app (DO NOT USE)
```

### Build and Testing
```bash
# Build
npm run build                        # Build all services
npm run build:shell                  # Build shell app only
npm run build:service investigation  # Build specific service

# Testing
npm test                             # Run all service tests
npm run test:integration             # Cross-service integration tests
npm run test:coverage                # Coverage across all services

# Quality
npm run lint                         # Lint all services
npm run format                       # Format all services
npm run typecheck                    # TypeScript checks across services
```

### Migration Tools
```bash
# Check migration status
npm run migration:check              # Check migration progress
npm run migration:mui-finder         # Find remaining Material-UI usage
npm run migration:file-sizes         # Check files over 200 lines
npm run migration:bundle-analysis    # Analyze bundle sizes
```

## File Structure (Refactored)

```
src/
├── microservices/                   # NEW: Microservices architecture
│   ├── investigation/               # Investigation service
│   ├── agent-analytics/             # Agent analytics service
│   ├── rag-intelligence/            # RAG intelligence service
│   ├── visualization/               # Visualization service
│   ├── reporting/                   # Reporting service
│   └── core-ui/                     # Core UI service
├── shared/                          # NEW: Shared components and utilities
│   ├── components/                  # Tailwind CSS component library
│   ├── hooks/                       # Shared React hooks
│   ├── types/                       # TypeScript definitions
│   ├── events/                      # Event bus implementation
│   └── services/                    # Shared API services
├── legacy/                          # DEPRECATED: Old monolithic components
│   ├── components/                  # OLD: React components (MIGRATING)
│   ├── services/                    # OLD: API services (MIGRATING)
│   └── types/                       # OLD: TypeScript types (MIGRATING)
└── config/                          # Module federation configurations
```

## Configuration Standards (SYSTEM MANDATE Compliant)

### Environment Variables
```bash
# Required environment variables
REACT_APP_ENV=production|staging|development
REACT_APP_API_BASE_URL=https://<backend-api-host>
REACT_APP_WS_BASE_URL=wss://<websocket-host>
REACT_APP_FRONTEND_PORT=3000

# Feature flags
REACT_APP_FEATURE_ENABLE_RAG=true
REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES=true
REACT_APP_FEATURE_ENABLE_MICROSERVICES=true

# UI Configuration
REACT_APP_PAGINATION_SIZE=20
REACT_APP_REQUEST_TIMEOUT_MS=30000

# Authentication (from secret manager)
REACT_APP_AUTH_TOKEN=<secret-manager>
```

### Configuration Schema
All configuration MUST be validated using Zod schema with fail-fast behavior:

```typescript
import * as z from "zod";

export const ConfigSchema = z.object({
  env: z.enum(["production", "staging", "development"]),
  apiBaseUrl: z.string().url(),
  wsBaseUrl: z.string().url(),
  features: z.object({
    enableRag: z.boolean(),
    enableRealTimeUpdates: z.boolean(),
    enableMicroservices: z.boolean()
  }),
  ui: z.object({
    paginationSize: z.number().int().positive(),
    requestTimeoutMs: z.number().int().positive()
  })
});
```

## Critical Files Requiring Immediate Refactoring

### Files Over 200 Lines (MUST BE SPLIT):
1. `src/js/pages/RAGPage.tsx` (2,273 lines) → Split into RAG microservice
2. `src/js/pages/InvestigationPage.tsx` (1,913 lines) → Split into Investigation microservice
3. `src/js/components/AgentDetailsTable.tsx` (994 lines) → Move to Agent Analytics service
4. 16 additional files over 200 lines

## Development Standards (SYSTEM MANDATE Compliance)

### Styling Requirements
- **MANDATORY**: Use ONLY Tailwind CSS classes
- **PROHIBITED**: Any Material-UI imports (`@mui/material`, `@mui/icons-material`, `styled-components`)
- **REQUIRED**: Create custom components using Headless UI + Tailwind

### Component Architecture
- **Service Isolation**: Each microservice must be independently deployable
- **Event-Driven**: Inter-service communication via event bus
- **Configuration-Driven**: All URLs, features, and UI settings from environment variables
- **Dependency Injection**: Services receive dependencies through constructors

### File Size Compliance
- **MANDATORY**: All `.tsx/.ts` files under 200 lines
- **METHOD**: Break large files into focused, single-purpose modules
- **MAINTAIN**: Full documentation and comments while achieving modularity

## Integration Points

### Backend Integration
- **REST API**: Configuration-driven endpoint URLs
- **WebSocket**: Real-time updates with configurable connection
- **Authentication**: JWT token from configuration/secret manager

### Real-Time Features
- **WebSocket connections**: Live investigation updates
- **Event bus**: Inter-service communication
- **State synchronization**: Shared state across microservices

## Testing Strategy (No Mocks in Production)

### Integration Testing
- **Real API connections**: Configure test endpoints via environment
- **WebSocket testing**: Real connection testing with test servers
- **Cross-service testing**: Integration tests between microservices

### Component Testing
- **React Testing Library**: Test user interactions
- **Configuration injection**: Test with various config scenarios
- **Error boundary testing**: Service failure handling

## Deployment Considerations

### Microservices Deployment
- **Independent builds**: Each service builds and deploys separately
- **Module federation**: Runtime composition of services
- **Configuration**: Environment-specific configuration injection
- **Health checks**: Individual service health monitoring

### Production Requirements
- **Environment variables**: All configuration from environment/secrets
- **Bundle optimization**: Code splitting and lazy loading
- **Error boundaries**: Graceful service failure handling
- **Monitoring**: Real-time service health and performance

## Migration Progress Tracking

### Current Status:
- **Files Migrated**: 0/169 components
- **Material-UI Imports**: ~50+ remaining (needs verification)
- **Files Over 200 Lines**: 19 files (needs immediate attention)
- **Microservices Implemented**: 0/6 services
- **Tailwind Components**: 0/25 estimated needed

### Next Steps:
1. **Audit existing codebase**: Identify all Material-UI usage
2. **Create shared component library**: Tailwind-based components
3. **Implement Core UI Service**: Authentication and shared components
4. **Migrate Investigation Service**: Core functionality first
5. **Continue with remaining services**: Agent Analytics, RAG, Visualization, Reporting

## Common Issues and Solutions

### Material-UI Migration
- **Problem**: Existing Material-UI components
- **Solution**: Replace with Tailwind CSS + Headless UI equivalents

### File Size Violations
- **Problem**: Files over 200 lines
- **Solution**: Extract focused modules with single responsibilities

### Configuration Hardcoding
- **Problem**: Hardcoded URLs, ports, features
- **Solution**: Move all values to environment variables with validation

### Service Communication
- **Problem**: Direct component coupling
- **Solution**: Event-driven architecture with proper boundaries

This frontend follows the SYSTEM MANDATE with configuration-driven design, no hardcoded values, and production-grade architecture suitable for enterprise fraud detection workflows.