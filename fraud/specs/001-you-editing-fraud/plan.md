# Implementation Plan: Investigation Comparison Pipeline

**Branch**: `001-you-editing-fraud` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-you-editing-fraud/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a backend investigation/evaluation pipeline that compares matched time windows for a specific entity (and/or merchant scope) and returns metrics + deltas. A frontend Comparison page (Olorin look & feel) visualizes the results side-by-side and supports presets & custom windows.

**Technical Approach**: 
- Backend: FastAPI endpoint with window computation service, entity filtering service, metrics calculation service, and comparison orchestration service
- Frontend: React/TypeScript comparison page with side-by-side panels, charts (Recharts), and export functionality
- Database: Query transactions from Snowflake/PostgreSQL using existing database provider infrastructure
- Artifacts: Persist comparison results to JSON files in artifacts directory

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript/React (frontend)  
**Primary Dependencies**: 
- Backend: FastAPI, Pydantic, SQLAlchemy, pandas, pytz, snowflake-connector-python, phonenumbers (for E164 normalization)
- Frontend: React, TypeScript, Tailwind CSS, shadcn/ui, Recharts  
**Storage**: Snowflake (primary) / PostgreSQL (fallback) via existing database provider abstraction  
**Testing**: pytest (backend), Jest/Playwright (frontend)  
**Target Platform**: Linux server (backend), Web browser (frontend)  
**Project Type**: web (backend + frontend)  
**Performance Goals**: 
- Backend API completes within 5 seconds for entity-scoped queries with <100K transactions per window
- Frontend page loads and renders all visualizations within 2 seconds after API response  
**Constraints**: 
- All files <200 lines
- No mocks/stubs/TODOs in production code
- Zero-tolerance duplication policy
- All configuration from environment variables (risk threshold default: RISK_THRESHOLD_DEFAULT env var, fallback 0.7)
- Guard divide-by-zero; never crash on empty sets  
**Scale/Scope**: 
- Support entity types: email, phone, device_id, ip, account_id, card_fingerprint (requires BIN+last4), merchant_id
- Per-merchant breakdown capped at 25 merchants (configurable via max_merchants option)
- Risk histogram: 10 bins
- Timeseries: 14-day daily aggregates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Zero-tolerance duplication policy**: Reuse existing infrastructure (database provider, precision/recall calculator, router patterns, export utilities)  
✅ **No hardcoded values**: All configuration from environment variables (risk threshold, max merchants, timezone)  
✅ **Complete implementations only**: No mocks/stubs/TODOs in production code  
✅ **File size limit**: All files <200 lines (split services appropriately)  
✅ **Mandatory codebase analysis**: Already completed comprehensive scan before planning  
✅ **Use existing infrastructure**: Leverage existing database provider, router patterns, Pydantic models, frontend components

## Project Structure

### Documentation (this feature)

```text
specs/001-you-editing-fraud/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
olorin-server/
├── app/
│   ├── router/
│   │   ├── models/
│   │   │   └── investigation_comparison_models.py  # Pydantic models
│   │   └── investigation_comparison_router.py       # API endpoint
│   ├── service/
│   │   └── investigation/
│   │       ├── window_computation.py                # Window calculation
│   │       ├── entity_filtering.py                 # Entity normalization/filtering
│   │       ├── metrics_calculation.py              # Metrics computation
│   │       ├── comparison_service.py               # Orchestration
│   │       └── summary_generator.py                # Investigation summary
│   └── cli/
│       └── evaluate_investigation.py               # CLI entry point

olorin-front/
├── src/
│   ├── microservices/
│   │   └── investigation/
│   │       ├── pages/
│   │       │   └── ComparisonPage.tsx              # Main comparison page
│   │       ├── components/
│   │       │   ├── EntityPicker.tsx               # Entity selection
│   │       │   ├── WindowPicker.tsx               # Window selection
│   │       │   ├── ThresholdControl.tsx            # Risk threshold slider
│   │       │   ├── MerchantFilter.tsx             # Merchant multi-select
│   │       │   ├── KpiCards.tsx                   # KPI display
│   │       │   ├── ConfusionMatrixTile.tsx        # Confusion matrix
│   │       │   ├── RiskHistogram.tsx              # Histogram chart
│   │       │   ├── DailyTimeseries.tsx            # Timeseries chart
│   │       │   ├── DeltaStrip.tsx                 # Delta badges
│   │       │   ├── PerMerchantTable.tsx            # Merchant breakdown
│   │       │   └── SummaryBlock.tsx               # Summary with copy
│   │       └── services/
│   │           └── comparisonService.ts           # API client

tests/
├── unit/
│   ├── test_window_computation.py
│   ├── test_entity_filtering.py
│   ├── test_metrics_calculation.py
│   └── test_comparison_service.py
└── integration/
    └── test_comparison_e2e.py
```

**Structure Decision**: Web application structure with backend (olorin-server) and frontend (olorin-front) separated. Backend follows existing service/router pattern. Frontend follows existing microservices pattern with investigation service.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all requirements align with constitutional principles.

## Progress Tracking

### Phase 0: Research ✅ COMPLETE
- [x] Analyze feature specification
- [x] Scan codebase for existing infrastructure
- [x] Identify reusable components
- [x] Document technical approach
- [x] Generate research.md

### Phase 1: Design ✅ COMPLETE
- [x] Define data models (Pydantic)
- [x] Design API contracts
- [x] Plan service architecture
- [x] Design frontend component structure
- [x] Generate data-model.md
- [x] Generate contracts/investigation-comparison-api.md
- [x] Generate quickstart.md

### Phase 2: Task Breakdown ✅ COMPLETE
- [x] Generate detailed tasks.md (via /speckit.tasks command)

## Next Steps

1. ✅ Phase 0 Complete: research.md generated
2. ✅ Phase 1 Complete: data-model.md, contracts/investigation-comparison-api.md, quickstart.md generated
3. Run `/speckit.tasks` to generate tasks.md (Phase 2)

## Generated Artifacts

### Phase 0: Research
- ✅ `research.md` - Codebase analysis, infrastructure identification, technical decisions

### Phase 1: Design
- ✅ `data-model.md` - Data models, database schema mapping, validation rules
- ✅ `contracts/investigation-comparison-api.md` - API contract with request/response examples
- ✅ `quickstart.md` - Usage guide with examples and troubleshooting

### Phase 2: Task Breakdown
- ✅ `tasks.md` - Detailed implementation tasks (58 tasks across 8 phases, generated via `/speckit.tasks`)
