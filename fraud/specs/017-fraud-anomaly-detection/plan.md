# Implementation Plan: Fraud Anomaly Detection Service

**Branch**: `001-fraud-anomaly-detection` | **Date**: 2025-11-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fraud-anomaly-detection/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a production-ready Fraud Anomaly Detection service that detects time-based anomalies in transaction metrics using univariate algorithms (STL+MAD, CUSUM) and multivariate algorithms (Isolation Forest) per merchant cohort. The system integrates with existing analytics microservice, LangGraph investigation orchestrator, and investigations-management microservice to enable automated and manual investigation creation from detected anomalies.

**Status**: Phase 0 (Research) and Phase 1 (Design & Contracts) complete. Ready for Phase 2 (Task Breakdown).

## Technical Context

**Language/Version**: Python 3.11 (FastAPI backend), TypeScript 5.x (React 18 frontend)  
**Primary Dependencies**: FastAPI, statsmodels, scikit-learn, pandas, numpy, apscheduler (backend); React, TypeScript, Tailwind CSS (frontend)  
**Storage**: PostgreSQL (detectors, detection_runs, anomaly_events tables), Snowflake (marts_txn_window table)  
**Testing**: pytest (backend, 87%+ coverage), Jest + React Testing Library (frontend)  
**Target Platform**: Linux server (FastAPI on port 8090), Modern browsers (Chrome 90+, Firefox 90+, Safari 14+)  
**Project Type**: Web application (frontend + backend microservice extension)  
**Performance Goals**: Detection runs complete within 30s for 7-day window with 100 cohorts (p95), API endpoints respond within 200ms (p95), WebSocket streaming delivers events within 1s (p95), processes >= 10,000 cohorts/hour  
**Constraints**: File size limit 200 lines, no hardcoded values (all from config), no mocks/stubs/TODOs, minimum 87% test coverage, must integrate with existing analytics microservice  
**Scale/Scope**: Support 1000+ anomalies displayed in UI, handle 10,000+ cohorts/hour in detection runs, maintain >= 99% data completeness

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Phase 0 Check (Pre-Research)**: PASSED
- **No Mocks/Stubs/TODOs**: All implementations must be production-ready, using existing infrastructure
- **No Hardcoded Values**: All configuration from environment variables via existing ConfigLoader pattern
- **File Size Compliance**: All files must be < 200 lines, split into focused modules
- **No Duplication**: Reuse existing database providers, config loaders, API patterns, frontend components
- **Test Coverage**: Minimum 87% test coverage for all new code
- **Integration**: Must integrate with existing analytics microservice, not create parallel implementation
- **Schema-Locked**: PostgreSQL tables must be created via Alembic migrations (no DDL in code)

✅ **Phase 1 Check (Post-Design)**: Will re-evaluate after design phase
- No new project creation (extends existing olorin-server and olorin-front)
- Reuses existing database provider abstraction (Snowflake/PostgreSQL)
- Reuses existing LangGraph tools registry pattern
- Reuses existing investigation service integration
- File size constraint enforced (200 lines per file)
- Test coverage requirement met (87% minimum)

**Justification for Complexity**: None required. Feature extends existing analytics microservice with anomaly detection capabilities, reusing established patterns and infrastructure.

## Project Structure

### Documentation (this feature)

```text
specs/001-fraud-anomaly-detection/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api.yaml         # OpenAPI specification
│   └── websocket.md     # WebSocket event contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Backend (olorin-server)
olorin-server/
├── app/
│   ├── models/
│   │   └── anomaly.py                    # SQLAlchemy models (detectors, detection_runs, anomaly_events)
│   ├── api/
│   │   └── routes/
│   │       └── analytics.py              # Extended with anomaly endpoints
│   ├── service/
│   │   ├── anomaly/                      # NEW: Anomaly detection service layer
│   │   │   ├── __init__.py
│   │   │   ├── detector_factory.py       # Detector factory pattern
│   │   │   ├── detection_job.py         # Detection job orchestrator
│   │   │   ├── scoring.py                # Severity scoring logic
│   │   │   ├── guardrails.py             # Persistence, hysteresis, cooldowns
│   │   │   ├── detectors/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py               # Abstract base detector
│   │   │   │   ├── stl_mad.py            # STL+MAD detector
│   │   │   │   ├── cusum.py               # CUSUM detector
│   │   │   │   └── isoforest.py          # Isolation Forest detector
│   │   │   └── data/
│   │   │       └── windows.py             # Snowflake window data access
│   │   └── agent/
│   │       ├── tools/
│   │       │   └── anomaly_tools/         # NEW: LangGraph tools
│   │       │       ├── __init__.py
│   │       │       ├── fetch_series.py
│   │       │       ├── detect_anomalies.py
│   │       │       ├── list_anomalies.py
│   │       │       ├── open_investigation.py
│   │       │       └── attach_evidence.py
│   │       ├── orchestration/
│   │       │   └── nodes/
│   │       │       ├── anomaly_policy.py  # Policy decision logic
│   │       │       └── summarize_node.py  # RAG + LLM summary generation
│   │       └── tools/
│   │           └── tool_registry.py      # Extended with anomaly tools registration
│   ├── router/
│   │   └── controllers/
│   │       └── anomaly_controller.py     # Investigation creation from anomalies
│   └── config/
│       └── anomaly_config.py              # Anomaly detection configuration schema
├── alembic/
│   └── versions/
│       └── XXX_add_anomaly_tables.py      # Migration for detectors, detection_runs, anomaly_events
└── tests/
    ├── unit/
    │   └── service/
    │       └── anomaly/                   # Unit tests for detectors, scoring, guardrails
    ├── integration/
    │   └── api/
    │       └── test_anomaly_endpoints.py  # API endpoint integration tests
    └── e2e/
        └── test_anomaly_detection_flow.py # End-to-end detection flow tests

# Frontend (olorin-front)
olorin-front/
├── src/
│   ├── microservices/
│   │   └── analytics/                    # Extended existing microservice
│   │       ├── components/
│   │       │   ├── anomaly/
│   │       │   │   ├── AnomalyHub.tsx     # Main anomaly list page
│   │       │   │   ├── AnomalyTable.tsx   # Anomaly table component
│   │       │   │   ├── AnomalyFilters.tsx # Filter controls
│   │       │   │   ├── AnomalyDetails.tsx # Detail panel
│   │       │   │   ├── DetectorStudio.tsx # Detector configuration page
│   │       │   │   ├── DetectorForm.tsx   # Detector creation/edit form
│   │       │   │   ├── DetectorPreview.tsx # Score preview component
│   │       │   │   ├── ReplayStudio.tsx   # Replay/backtest page
│   │       │   │   └── ReplayComparison.tsx # Diff visualization
│   │       │   └── common/                # Shared components
│   │       │       ├── TimeSeriesChart.tsx
│   │       │       └── SeverityBadge.tsx
│   │       ├── hooks/
│   │       │   ├── useAnomalies.ts        # Anomaly data fetching hook
│   │       │   ├── useDetectors.ts         # Detector management hook
│   │       │   ├── useAnomalyWebSocket.ts # WebSocket streaming hook
│   │       │   └── useInvestigation.ts    # Investigation creation hook
│   │       ├── services/
│   │       │   └── anomalyApi.ts          # API client for anomaly endpoints
│   │       ├── types/
│   │       │   └── anomaly.ts             # TypeScript type definitions
│   │       └── pages/
│   │           ├── AnomalyHubPage.tsx     # Route: /analytics/anomalies
│   │           ├── DetectorStudioPage.tsx # Route: /analytics/detectors/:id
│   │           └── ReplayStudioPage.tsx   # Route: /analytics/replay
│   └── api/
│       └── analytics.ts                   # Extended with anomaly endpoints
└── tests/
    ├── unit/
    │   └── microservices/
    │       └── analytics/
    │           └── anomaly/                # Component unit tests
    └── integration/
        └── anomaly/                        # Integration tests
```

**Structure Decision**: Extends existing analytics microservice (both backend and frontend) rather than creating new microservice. Backend adds anomaly detection service layer and extends analytics API router. Frontend extends analytics microservice with new pages and components. Follows existing microservice architecture patterns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - feature extends existing infrastructure without adding architectural complexity.
