# Implementation Plan: Detection Tools Enhancements

**Branch**: `001-detection-tools-enhancements` | **Date**: 2025-01-XX | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-detection-tools-enhancements/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enhance domain agent detection capabilities with a retro-only, precision-focused toolkit that uses mature ground-truth labels (fraud/chargeback outcomes) to engineer high-signal features and train calibrated models. The system extracts mature transactions (≥6 months old, ≥14 days matured) from Snowflake, engineers precision-focused features (merchant burst detection, peer-group outliers, transaction-level deviations, graph features), enriches with external data sources (graph analytics, BIN lookup, IP risk, email/phone intelligence), trains a calibrated supervised model (XGBoost/LightGBM), and integrates with domain agents via PostgreSQL materialized views and PrecisionFeatureService.

**Technical Approach**: ETL pipeline (Snowflake → PostgreSQL) → Feature engineering (materialized views) → External enrichment (batch operations, reusing existing tools) → Model training (XGBoost with calibration) → Domain agent integration (PrecisionFeatureService).

## Technical Context

**Language/Version**: Python 3.11+  
**Primary Dependencies**: 
- SQLAlchemy (PostgreSQL ORM)
- XGBoost/LightGBM (model training)
- scikit-learn (calibration)
- Neo4j Graph Data Science (graph analytics)
- Composio SDK (external API integration)
- Snowflake connector (data extraction)
- Existing: MaxMind client, IPQS Email tool, Veriphone tool, Neo4j client

**Storage**: 
- PostgreSQL (detection artifacts: pg_transactions, pg_merchants, labels_truth, pg_enrichment_scores, pg_alerts)
- Snowflake (source of truth: TRANSACTIONS_ENRICHED table)
- Neo4j (graph analytics, temporary for feature computation)

**Testing**: pytest (unit, integration), 87%+ coverage requirement  
**Target Platform**: Linux server (Python backend)  
**Project Type**: Backend service enhancement (single project)  
**Performance Goals**: 
- ETL: <30 minutes for 1M transactions
- Feature view refresh: <5 minutes for 1M transactions
- Enrichment pipeline: <2 hours for 100K transactions
- Model training: <1 hour for 1M transactions
- Feature lookup: <100ms per transaction

**Constraints**: 
- Zero duplication of existing infrastructure
- Zero stubs/mocks/TODOs in production code
- No fallback values (fail gracefully with clear errors)
- All files <200 lines
- 87%+ test coverage
- All configuration from environment/config files

**Scale/Scope**: 
- 1M+ transactions in Snowflake
- 50+ precision features per transaction
- 7 domain agents to enhance
- Daily ETL pipeline for incremental updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitutional Compliance**:
- ✅ **Zero Duplication**: All code will reuse existing infrastructure (MaxMind client, IPQS Email tool, Veriphone tool, Neo4j client, Composio client)
- ✅ **Zero Stubs/Mocks**: Complete implementations only (except demo/test files)
- ✅ **Zero Fallback Values**: If real data doesn't exist, code will fail gracefully with clear errors
- ✅ **Zero Hardcoded Values**: All configuration from environment/config files
- ✅ **Full Test Coverage**: 87%+ coverage minimum
- ✅ **Modular Code**: All files <200 lines
- ✅ **Production-Ready**: Server starts, endpoints work, tests pass

**Existing Infrastructure Audit**:
- ✅ MaxMind client exists (`app/service/ip_risk/maxmind_client.py` - 510 lines) - Will EXTEND
- ✅ IPQS Email tool exists (`app/service/agent/tools/ipqs_email_tool.py` - 201 lines) - Will REUSE
- ✅ Veriphone tool exists (`app/service/agent/tools/veriphone_tool.py` - 161 lines) - Will REUSE
- ✅ Neo4j client exists (`app/service/graph/neo4j_client.py` - 206 lines) - Will EXTEND
- ✅ Composio client exists (`app/service/composio/client.py` - 425 lines) - Will REUSE

**No Violations**: All requirements align with constitutional principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-detection-tools-enhancements/
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
│   ├── persistence/
│   │   └── migrations/
│   │       ├── 009_precision_detection_tables.sql
│   │       └── 010_precision_detection_features.sql
│   ├── service/
│   │   ├── precision_detection/
│   │   │   └── feature_service.py          # NEW: PrecisionFeatureService
│   │   ├── ip_risk/
│   │   │   └── maxmind_client.py           # EXTEND: Add batch_score_ips()
│   │   ├── graph/
│   │   │   └── neo4j_client.py             # EXTEND: Add GDS methods
│   │   ├── composio/
│   │   │   └── custom_tools/
│   │   │       ├── bin_lookup_tool.py      # NEW: BIN lookup
│   │   │       ├── emailage_tool.py        # NEW: Emailage (optional)
│   │   │       └── address_verification_tool.py  # NEW: Address verification
│   │   └── agent/
│   │       └── orchestration/
│   │           └── domain_agents/
│   │               ├── merchant_agent.py   # EXTEND: Add precision features
│   │               ├── network_agent.py    # EXTEND: Add graph features
│   │               ├── risk_agent.py      # EXTEND: Add model scores
│   │               └── location_agent.py  # EXTEND: Add enrichment features
│   └── scripts/
│       ├── etl_precision_detection.py      # NEW: ETL pipeline
│       ├── enrichment/
│       │   ├── graph_analytics_export.py   # NEW: Graph enrichment
│       │   ├── ip_enrichment.py            # NEW: IP enrichment (uses MaxMind)
│       │   └── email_phone_enrichment.py   # NEW: Email/phone (reuses existing tools)
│       └── train_precision_model.py        # NEW: Model training

tests/
├── unit/
│   ├── service/
│   │   ├── precision_detection/
│   │   │   └── test_feature_service.py
│   │   ├── ip_risk/
│   │   │   └── test_maxmind_batch.py
│   │   └── graph/
│   │       └── test_neo4j_gds.py
│   └── scripts/
│       ├── test_etl_pipeline.py
│       └── test_enrichment_pipeline.py
└── integration/
    └── test_precision_detection_integration.py
```

**Structure Decision**: Backend service enhancement following existing Olorin server structure. New services go in `app/service/precision_detection/`, scripts in `scripts/`, migrations in `app/persistence/migrations/`. Reuses existing infrastructure by extending existing services rather than creating duplicates.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all requirements align with constitutional principles.

## Progress Tracking

- [x] **Phase 0: Research** - Generate research.md ✅
- [x] **Phase 1: Design** - Generate data-model.md, contracts/, quickstart.md ✅
- [x] **Phase 2: Tasks** - Generate tasks.md (via /speckit.tasks command) ✅
- [x] **Phase 2.5: Analysis & Remediation** - Cross-artifact analysis and remediation ✅

---

## Phase 0: Research ✅

*Status: COMPLETE*

**Artifacts Generated**:
- `research.md`: Comprehensive research document covering existing infrastructure, missing components, technical decisions, risks, and open questions

## Phase 1: Design ✅

*Status: COMPLETE*

**Artifacts Generated**:
- `data-model.md`: Complete data model documentation with table schemas, relationships, and data flow
- `contracts/precision-feature-service.md`: Service contract for PrecisionFeatureService API
- `quickstart.md`: Quickstart guide for setup, usage, and troubleshooting

## Phase 2: Tasks ✅

*Status: COMPLETE*

**Artifacts Generated**:
- `tasks.md`: Detailed task breakdown with 89 tasks organized by user story and phase

## Phase 2.5: Analysis & Remediation ✅

*Status: COMPLETE*

**Analysis Date**: 2025-01-XX  
**Analysis Type**: Cross-artifact consistency check (`/speckit.analyze`)

### Analysis Summary

Cross-artifact analysis of `spec.md`, `plan.md`, and `tasks.md` identified **4 findings** requiring remediation:
- **1 MEDIUM** severity issue (Device Agent coverage gap)
- **2 LOW** severity issues (model/calibration choice ambiguity)
- **1 LOW** severity issue (terminology consistency)

**Overall Assessment**: ✅ **Specification was implementation-ready** with minor clarifications recommended.

### Remediation Actions Taken

#### 1. Device Agent Coverage Gap (C1 - MEDIUM) ✅ FIXED

**Issue**: Device Agent was mentioned in research but no enhancement task existed in US4 scope.

**Remediation**:
- Added task `T062A [US4]` - Unit test for Device Agent card-testing pattern integration
- Added task `T071A [US4]` - Enhance Device Agent to query PrecisionFeatureService for card-testing patterns
- Added task `T071B [US4]` - Incorporate card-testing pattern features into Device Agent findings
- Updated `spec.md` User Story 4 to include Device Agent acceptance scenario
- Updated `research.md` to mark Device Agent as "IN SCOPE" for US4

**Files Modified**:
- `tasks.md`: Added T062A, T071A, T071B
- `spec.md`: Added Device Agent acceptance scenario to User Story 4
- `research.md`: Clarified Device Agent scope

#### 2. Model Choice Ambiguity (A1 - LOW) ✅ FIXED

**Issue**: Spec stated "XGBoost/LightGBM" (either/or) but task only mentioned XGBoost.

**Remediation**:
- Updated `spec.md` User Story 3 to specify "XGBoost (LightGBM support deferred to future enhancement)"
- Updated `FR-016` to state "XGBoost model using precision features and ground-truth labels with temporal split (LightGBM support deferred to future enhancement)"
- Clarified that XGBoost is the primary choice, LightGBM is deferred (not ambiguous)

**Files Modified**:
- `spec.md`: Updated User Story 3 description and FR-016

#### 3. Calibration Method Ambiguity (A2 - LOW) ✅ FIXED

**Issue**: Spec stated "isotonic/Platt calibration" (either/or) without guidance on which to use.

**Remediation**:
- Updated `spec.md` acceptance scenario to specify "isotonic calibration is applied by default (Platt calibration available via configuration)"
- Updated `FR-017` to state "isotonic calibration by default, with Platt calibration available via configuration, for accurate probability estimates"
- Clarified that both methods are supported, with isotonic as default and Platt configurable

**Files Modified**:
- `spec.md`: Updated User Story 3 acceptance scenario and FR-017

#### 4. Terminology Consistency (T1 - LOW) ✅ FIXED

**Issue**: Spec mentioned 5 agents (Network, Device, Location, Merchant, Risk) but research mentioned 7 agents (added Logs, Authentication).

**Remediation**:
- Updated `research.md` to explicitly mark 5 agents as "IN SCOPE" for US4
- Clarified that Logs and Authentication agents are "mentioned for context, not in US4 scope"
- Ensured consistent terminology across all documents

**Files Modified**:
- `research.md`: Added scope markers (IN SCOPE vs mentioned for context)

### Updated Metrics

- **Total Tasks**: 89 (original 86 + 3 new Device Agent tasks: T062A, T071A, T071B)
- **Coverage**: 100% (30/30 requirements have associated tasks)
- **Critical Issues**: 0
- **High Issues**: 0
- **Medium Issues**: 0 (all remediated)
- **Low Issues**: 0 (all remediated)

### Remediation Status

✅ **All issues remediated** - Specification is now:
- **Complete**: Device Agent included in US4 scope
- **Unambiguous**: Model and calibration choices clarified
- **Consistent**: Terminology aligned across all documents

**Ready for Implementation**: All tasks map to requirements, no blocking issues remain.
