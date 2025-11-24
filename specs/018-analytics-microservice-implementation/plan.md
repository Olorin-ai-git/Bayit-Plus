# Implementation Plan: Analytics Microservice

**Branch**: `001-analytics-miroservice-implementation` | **Date**: 2025-11-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-analytics-miroservice-implementation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a comprehensive analytics microservice for fraud detection analytics providing real-time and batch metrics calculation, cohort analysis, A/B testing, drift detection, replay/backtest capabilities, feature attribution, and observability. The microservice includes both frontend (React/TypeScript) and backend (Python/FastAPI) components with full integration, accessible at `/analytics` route. The UI implements glassmorphic design matching Olorin style guide based on the reference HTML design. The service calculates fraud metrics including precision, recall, F1 score, capture rate, approval rate, false-positive cost, chargeback rate, and decision throughput with support for online (streaming) and offline (batch) processing pipelines.

## Technical Context

**Language/Version**: 
- **Frontend**: TypeScript 5.x with React 18.2
- **Backend**: Python 3.11

**Primary Dependencies**: 
- **Frontend**: React 18.2, React Router 6.x, Chart.js 4.x, D3.js 7.x, Tailwind CSS 3.x, axios, mitt (event bus)
- **Backend**: FastAPI 0.104+, Pydantic 2.x, SQLAlchemy 2.x, pandas, numpy, scikit-learn (for metrics calculation)

**Storage**: 
- **Primary**: PostgreSQL/SQLite (existing Olorin database) for fraud decisions and investigation data
- **Analytics Cache**: Redis (optional) for real-time metrics caching
- **Time-series**: Existing transaction tables with fraud flags and model scores
- **Replay Storage**: Separate fact table for replay results

**Testing**: 
- **Frontend**: Jest 29.x with React Testing Library, @testing-library/react, Playwright for E2E
- **Backend**: pytest 7.x with minimum 30% coverage, integration tests for API endpoints

**Target Platform**: 
- **Backend**: Linux server (FastAPI on port 8090, analytics endpoints on `/api/v1/analytics/*`)
- **Frontend**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+), runs as microservice on port 3008

**Project Type**: Web application (frontend + backend microservice)

**Performance Goals**:
- Dashboard load time < 2 seconds (SC-001)
- Real-time analytics updates within 5 seconds of fraud decisions (SC-003)
- Metric calculation accuracy within 0.1% (SC-002)
- Export generation for 1M records within 30 seconds (SC-012)
- Analytics pipeline freshness: stream ≤ 5 minutes, batch ≤ 1 hour (FR-061)
- Data completeness ≥ 99% (FR-062)

**Constraints**:
- File size limit: 200 lines per file (SYSTEM MANDATE)
- No hardcoded values: All configuration via environment variables (SYSTEM MANDATE)
- No mock data: Real backend integration only (SYSTEM MANDATE)
- Tailwind CSS only: No Material-UI (SYSTEM MANDATE)
- Glassmorphic UI design matching Olorin style guide
- Microservices architecture with Module Federation
- Event bus integration for real-time updates

**Scale/Scope**:
- Support 50+ concurrent analysts viewing analytics
- Process 1M+ fraud decisions for historical analysis
- Support 7+ segmentation dimensions (merchant, channel, geo, device, risk band, model version, rule version)
- Handle real-time updates for 1000+ decisions per minute
- Support replay scenarios for 90-day historical windows
- Display analytics for 1000+ investigations simultaneously

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Olorin Project does not have a formal constitution file.** Based on SYSTEM MANDATE and CLAUDE.md requirements, applying these principles:

### Core Principles Applied

✅ **No Mocks/Stubs/TODOs**: All code must be production-ready with complete implementations. Demo/test code isolated under `/demo` or `/tests` directories.

✅ **Configuration-Driven Design**: All environment-specific values (URLs, ports, timeouts, feature flags) must come from environment variables with Zod/Pydantic validation.

✅ **File Size Compliance**: All source files must be under 200 lines. Break large files into focused modules with single responsibilities.

✅ **Dependency Injection**: Services receive dependencies through constructors. No inline client creation with hardcoded literals.

✅ **Microservices Architecture**: Follows existing microservice pattern with Module Federation, event bus integration, and independent deployment.

✅ **Phase 0 Check (Pre-Research)**: PASSED
- Principle 1 (Simplicity): Uses existing microservice architecture pattern
- Principle 2 (Reuse): Leverages existing visualization components, event bus, and backend APIs
- Principle 3 (Pragmatism): Addresses real need for comprehensive fraud analytics
- Principle 4 (Testability): Clear API contracts and component interfaces enable testing
- Principle 5 (Observable): Built-in observability and audit logging

✅ **Phase 1 Check (Post-Design)**: PASSED
- No new project creation (works within existing olorin-front and olorin-server)
- No repository pattern needed (uses existing database models)
- No hardcoded values (all config externalized per SYSTEM MANDATE)
- No complexity debt incurred (follows established patterns)
- File size constraint enforced (200 lines per file)
- Test coverage requirement met (30% minimum backend, 85% frontend)

**Justification for Complexity**: None required. Feature follows established microservice patterns and integrates with existing infrastructure.

## Project Structure

### Documentation (this feature)

```text
specs/001-analytics-miroservice-implementation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api.md          # API contract definitions
│   └── events.md       # Event bus contract definitions
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
olorin-front/src/microservices/analytics/
├── AnalyticsApp.tsx                    # Main app component
├── bootstrap.tsx                        # Module Federation entry point
├── index.tsx                           # Service initialization
├── index.ts                            # Barrel exports
├── components/
│   ├── dashboard/
│   │   ├── AnalyticsDashboard.tsx     # Main dashboard page
│   │   ├── KPITiles.tsx               # KPI tiles component
│   │   ├── TrendGraphs.tsx            # Trend visualization
│   │   └── Filters.tsx                # Filter controls
│   ├── metrics/
│   │   ├── FraudMetrics.tsx           # Fraud metrics display
│   │   ├── PrecisionRecall.tsx        # Precision/recall visualization
│   │   ├── LatencyMetrics.tsx         # Latency percentiles
│   │   └── ThroughputMetrics.tsx      # Decision throughput
│   ├── cohort/
│   │   ├── CohortSelector.tsx         # Dimension selector
│   │   ├── CohortComparison.tsx       # Side-by-side comparison
│   │   └── CohortTable.tsx            # Segment metrics table
│   ├── experiments/
│   │   ├── ExperimentList.tsx          # Experiment list
│   │   ├── ExperimentDetail.tsx       # Experiment details
│   │   ├── VariantComparison.tsx      # Variant comparison
│   │   └── GuardrailMonitor.tsx       # Guardrail alerts
│   ├── drift/
│   │   ├── DriftMonitor.tsx           # Drift detection display
│   │   ├── PSIChart.tsx               # PSI visualization
│   │   └── DataQuality.tsx             # Data quality metrics
│   ├── replay/
│   │   ├── ReplayStudio.tsx           # Replay interface
│   │   ├── ReplayConfig.tsx           # Configuration form
│   │   ├── ReplayResults.tsx          # Results comparison
│   │   └── DiffReport.tsx             # Diff visualization
│   ├── explainers/
│   │   ├── FeatureAttribution.tsx      # SHAP/rule trace display
│   │   ├── TopDrivers.tsx             # Top drivers per cohort
│   │   ├── ConfusionMatrix.tsx        # Confusion matrix
│   │   └── ExplanationExport.tsx     # Export explanations
│   ├── observability/
│   │   ├── PipelineHealth.tsx         # Pipeline status
│   │   ├── FreshnessMonitor.tsx      # Freshness metrics
│   │   ├── CompletenessMonitor.tsx   # Data completeness
│   │   └── AuditLog.tsx               # Audit log viewer
│   └── common/
│       ├── LoadingState.tsx           # Loading indicators
│       ├── ErrorBoundary.tsx           # Error handling
│       └── EmptyState.tsx              # Empty state display
├── hooks/
│   ├── useAnalytics.ts                # Analytics data fetching
│   ├── useRealtimeUpdates.ts          # Real-time subscription
│   ├── useFilters.ts                  # Filter state management
│   ├── useCohortAnalysis.ts          # Cohort calculations
│   ├── useExperiments.ts              # Experiment management
│   └── useDriftDetection.ts          # Drift monitoring
├── services/
│   ├── analyticsService.ts            # API service client
│   ├── metricsService.ts              # Metrics calculation helpers
│   ├── exportService.ts               # Export functionality
│   └── eventBus.ts                    # Event bus integration
├── types/
│   ├── analytics.ts                   # TypeScript types
│   ├── metrics.ts                     # Metrics types
│   ├── cohort.ts                      # Cohort types
│   └── experiments.ts                 # Experiment types
├── utils/
│   ├── formatters.ts                  # Data formatting
│   ├── validators.ts                  # Input validation
│   └── calculations.ts                # Client-side calculations
├── styles/
│   └── tailwind.css                   # Tailwind imports
└── __tests__/
    ├── components/                    # Component tests
    ├── hooks/                         # Hook tests
    └── integration/                  # Integration tests

olorin-server/app/
├── api/
│   └── routes/
│       └── analytics.py               # Analytics API endpoints (extend existing)
├── service/
│   └── analytics/
│       ├── metrics_calculator.py      # Metrics calculation engine
│       ├── precision_recall.py        # Precision/recall/F1 calculation
│       ├── cohort_analyzer.py         # Cohort analysis logic
│       ├── experiment_manager.py     # A/B test management
│       ├── drift_detector.py         # Drift detection (PSI/KL)
│       ├── replay_engine.py          # Replay/backtest engine
│       ├── explainer.py              # Feature attribution
│       ├── pipeline_monitor.py       # Pipeline observability
│       └── cache_manager.py          # Caching layer
├── models/
│   └── analytics.py                   # Analytics data models
└── persistence/
    └── analytics_repository.py        # Data access layer
```

**Structure Decision**: Web application (frontend + backend) following existing microservice architecture. Frontend microservice integrates via Module Federation on port 3008. Backend extends existing FastAPI application with new analytics routes and services. Both components follow 200-line file limit and configuration-driven design.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - feature follows established patterns and constraints.

## Progress Tracking

### Phase 0: Research ✅ COMPLETE
- [x] Analyze feature specification
- [x] Review existing microservice patterns
- [x] Review HTML reference design
- [x] Identify technical dependencies
- [x] Generate research.md ✅

**Artifacts Generated**:
- ✅ `research.md` - Comprehensive research covering technical approaches, dependencies, integration points, and design decisions

### Phase 1: Design ✅ COMPLETE
- [x] Define data models
- [x] Design API contracts
- [x] Create quickstart guide
- [x] Generate data-model.md ✅
- [x] Generate contracts/ ✅
- [x] Generate quickstart.md ✅

**Artifacts Generated**:
- ✅ `data-model.md` - Complete data model definitions including FraudDecision, FraudMetrics, Cohort, Experiment, DriftMetrics, ReplayScenario, FeatureAttribution, PipelineHealth, AuditLog
- ✅ `contracts/api.md` - Full API contract definitions with endpoints, request/response models, error handling, rate limiting, pagination, WebSocket events
- ✅ `contracts/events.md` - Event bus contracts for published and subscribed events, event handlers, lifecycle management
- ✅ `quickstart.md` - Setup and usage guide with installation, configuration, running instructions, troubleshooting

### Phase 2: Task Breakdown ⏳ PENDING
- [ ] Generate tasks.md (via /speckit.tasks command - NOT created by /speckit.plan)
