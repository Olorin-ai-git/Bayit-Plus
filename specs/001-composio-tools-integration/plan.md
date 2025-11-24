# Implementation Plan: Composio Tools Integration

**Branch**: `001-composio-tools-integration` | **Date**: 2025-01-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-composio-tools-integration/spec.md`

**Note**: This plan implements Composio tools integration to enhance the Olorin fraud detection platform with unified OAuth, device fingerprinting, IP risk scoring, automated SOAR responses, and real-time feature pipelines.

## Summary

Integrate Composio as a unified OAuth and action execution layer for the Olorin fraud detection platform. This enables:

1. **Tenant-scoped OAuth connections** (BYOC - Bring Your Own Credentials) for Stripe, Shopify, Okta, Slack, Jira, and 250+ other toolkits
2. **Device fingerprint SDK integration** (Fingerprint Pro/SEON/IPQS) for edge signal capture at signup/login/checkout with tenant-configurable SDK selection
3. **MaxMind minFraud integration** for real-time IP/transaction risk scoring before authorization
4. **SOAR playbook automation** via Composio actions for automated fraud containment (void, refund, cancel, step-up MFA, notify)
5. **Snowpipe Streaming + Dynamic Tables** for sub-minute feature freshness
6. **Graph database integration** (Neo4j/TigerGraph) for mule ring and synthetic identity detection with configurable database selection

The integration enhances existing threat detection tools (AbuseIPDB, VirusTotal, Shodan) without replacing them, adds new capabilities for automated responses, and maintains full backward compatibility.

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript/React 18 (frontend)
**Primary Dependencies**:
- **Composio**: `composio-core` Python SDK for unified OAuth and action execution
- **Device SDKs**: Fingerprint Pro, SEON, or IPQS JavaScript SDKs for browser-side device fingerprinting (tenant-configurable)
- **MaxMind**: `maxminddb` Python library for minFraud API integration
- **Snowflake**: `snowflake-connector-python`, `snowflake-sqlalchemy` (existing)
- **Splunk SOAR**: REST API integration for playbook orchestration
- **Neo4j/TigerGraph**: `neo4j` Python driver or TigerGraph Python client for graph database integration (configurable)
- **FastAPI**: Existing backend framework (no changes)
- **React**: Existing frontend framework (no changes)

**Storage**:
- **PostgreSQL**: Existing investigation state, audit logs, tenant connections (new `composio_connections` table)
- **Snowflake**: Transaction data, device signals, IP risk scores, graph features (new tables: `device_signals`, `ip_risk_scores`, `graph_features`)
- **Redis**: Caching for Composio connection status, MaxMind score caching

**Testing**:
- `pytest` for Python backend unit/integration tests
- `jest` + `@testing-library/react` for frontend component tests
- Integration tests for Composio OAuth flows, SOAR playbook execution, device SDK capture

**Target Platform**: Linux server (backend), Web browsers (frontend + device SDK)
**Project Type**: Web application (backend + frontend)
**Performance Goals**:
- Composio OAuth connection: <2 seconds
- Device SDK capture: <100ms browser-side, <5s persistence to Snowflake
- MaxMind minFraud scoring: <200ms per transaction
- SOAR playbook execution: <60 seconds end-to-end
- Snowpipe Streaming ingestion: <10 seconds latency

**Constraints**:
- Tenant data isolation required (all Composio actions must be tenant-scoped)
- Backward compatibility with existing threat intel tools (AbuseIPDB, VirusTotal, Shodan)
- Device SDK must degrade gracefully if browser blocks or SDK fails
- MaxMind API rate limits must be respected (caching required)
- SOAR playbooks must handle missing tenant connections gracefully
- Encryption at rest: AES-256-GCM with cloud provider key management (AWS KMS/GCP KMS/Azure Key Vault)

**Scale/Scope**:
- Multi-tenant platform (10-1000+ tenants)
- 1M+ transactions/day processed through MaxMind minFraud
- 500+ Composio toolkit integrations available
- Real-time feature pipeline processing 10k+ events/second

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: ✅ PASSED

**Analysis**: The constitution file appears to be a template. No specific violations identified. The implementation follows existing Olorin architecture patterns:
- Uses existing Python/FastAPI backend structure
- Integrates with existing PostgreSQL and Snowflake databases
- Maintains backward compatibility with existing tools
- Follows existing agent architecture patterns
- No new architectural patterns introduced that violate simplicity principles

**Re-check Required**: After Phase 1 design to verify no complexity violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/001-composio-tools-integration/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md         # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
olorin-server/
├── app/
│   ├── models/
│   │   └── composio_connection.py          # ComposioConnection model
│   ├── router/
│   │   ├── composio_router.py              # Composio OAuth and connection management endpoints
│   │   ├── soar_playbooks_router.py       # SOAR playbook execution endpoints
│   │   ├── device_signals_router.py        # Device signals endpoints
│   │   ├── ip_risk_router.py              # IP risk scoring endpoints
│   │   └── tenant_config_router.py        # Tenant configuration endpoints
│   ├── service/
│   │   ├── composio/
│   │   │   ├── __init__.py
│   │   │   ├── client.py                   # Composio SDK client wrapper
│   │   │   ├── oauth_manager.py            # OAuth flow management
│   │   │   └── action_executor.py          # Action execution with tenant scoping
│   │   ├── device_fingerprint/
│   │   │   ├── __init__.py
│   │   │   ├── sdk_manager.py              # Device SDK integration manager (multi-SDK support)
│   │   │   └── signal_processor.py        # Process and persist device signals
│   │   ├── ip_risk/
│   │   │   ├── __init__.py
│   │   │   ├── maxmind_client.py           # MaxMind minFraud client
│   │   │   └── score_cache.py              # IP risk score caching
│   │   ├── soar/
│   │   │   ├── __init__.py
│   │   │   ├── playbook_executor.py        # SOAR playbook execution
│   │   │   └── composio_integration.py     # SOAR + Composio integration
│   │   └── graph/
│   │       ├── __init__.py
│   │       ├── neo4j_client.py             # Neo4j graph database client
│   │       ├── tigergraph_client.py       # TigerGraph client (abstraction layer)
│   │       └── feature_computer.py         # Graph feature computation
│   └── service/agent/tools/
│       ├── composio_tool.py                # LangChain tool for Composio actions
│       ├── device_fingerprint_tool.py       # Device fingerprint tool
│       ├── maxmind_minfraud_tool.py        # MaxMind minFraud tool
│       └── graph_feature_tool.py           # Graph feature tool

olorin-front/
├── src/
│   ├── components/
│   │   └── integrations/
│   │       ├── ComposioConnectionManager.tsx    # Tenant connection UI
│   │       └── IntegrationCard.tsx              # Integration status cards
│   ├── services/
│   │   └── composioService.ts                   # Composio API client
│   └── pages/
│       └── IntegrationsPage.tsx                  # Integrations management page

tests/
├── integration/
│   ├── test_composio_oauth_flow.py              # OAuth flow integration tests
│   ├── test_soar_playbook_execution.py          # SOAR playbook tests
│   └── test_device_sdk_integration.py          # Device SDK tests
└── unit/
    ├── test_composio_client.py
    ├── test_maxmind_client.py
    └── test_device_signal_processor.py
```

**Structure Decision**: Web application structure (backend + frontend) matches existing Olorin architecture. Backend uses FastAPI with service layer pattern. Frontend uses React with component-based architecture. Multi-SDK and multi-database support implemented via abstraction layers (SDK manager, graph client abstraction).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations identified. Implementation follows existing patterns and maintains simplicity through abstraction layers.

## Progress Tracking

### Phase 0: Research ✅ COMPLETE

**Status**: Complete  
**Artifact**: `research.md`  
**Date**: 2025-01-31

**Research Areas Covered**:
- Composio SDK and OAuth flow patterns
- Device fingerprint SDKs (Fingerprint Pro, SEON, IPQS)
- MaxMind minFraud API integration
- Splunk SOAR playbook orchestration
- Snowflake Snowpipe Streaming and Dynamic Tables
- Neo4j and TigerGraph graph database integration

**Key Findings**:
- Composio provides unified OAuth with tenant-scoped connections
- Multiple device SDKs supported with tenant configuration
- MaxMind minFraud offers transaction-level risk scoring
- SOAR playbooks orchestrate evidence collection; Composio executes actions
- Snowpipe Streaming enables sub-minute event ingestion
- Graph databases require abstraction layer for multi-database support

### Phase 1: Design ✅ COMPLETE

**Status**: Complete  
**Artifacts**: `data-model.md`, `contracts/`, `quickstart.md`  
**Date**: 2025-01-31

**Design Artifacts Generated**:
- **Data Model**: PostgreSQL and Snowflake schemas defined
  - `composio_connections` table with AES-256-GCM encryption
  - `device_signals`, `ip_risk_scores`, `graph_features` tables
  - Snowpipe Streaming and Dynamic Table configurations
- **API Contracts**: 4 contract files
  - Composio OAuth and connection management
  - Device fingerprint signal capture
  - MaxMind minFraud IP risk scoring
  - SOAR playbook execution
- **Quickstart Guide**: Step-by-step integration instructions

**Key Design Decisions**:
- Multi-SDK support via tenant configuration (FR-021)
- Multi-database graph support via abstraction layer (FR-022)
- AES-256-GCM encryption with cloud KMS (FR-002)
- Tenant-scoped OAuth connections (FR-001, FR-017)

### Phase 2: Task Decomposition ✅ COMPLETE

**Status**: Complete  
**Artifact**: `tasks.md`  
**Date**: 2025-01-31  
**Note**: Generated by `/speckit.tasks` command, not `/speckit.plan`

**Task Summary**:
- **Total Tasks**: 129 tasks
- **Phase 1 (Setup)**: 10 tasks
- **Phase 2 (Foundational)**: 13 tasks
- **Phase 3 (US1 - MVP)**: 17 tasks
- **Phase 4 (US2)**: 15 tasks (includes device feature computation)
- **Phase 5 (US3)**: 16 tasks
- **Phase 6 (US4)**: 15 tasks
- **Phase 7 (US5)**: 9 tasks
- **Phase 8 (US6)**: 14 tasks
- **Phase 9 (Polish)**: 20 tasks

**Parallel Opportunities**: ~60% of tasks can be parallelized (marked with [P])

**MVP Scope**: Phases 1-3 (Setup + Foundational + User Story 1) = 40 tasks

## Next Steps

All planning phases are complete. The specification has been clarified, research completed, design artifacts generated, and tasks decomposed.

**Ready for Implementation**: The feature is ready to proceed with `/speckit.implement` when development begins.

**Key Implementation Considerations**:
1. Start with Phase 1 (Setup) and Phase 2 (Foundational) - these block all user stories
2. User Story 1 (Composio OAuth) is the MVP foundation - complete before other stories
3. User Stories 2 and 3 can be parallelized after foundational phase
4. User Story 4 requires User Story 1 completion (needs Composio connections)
5. User Stories 5 and 6 are independent but benefit from US2/US3 data
