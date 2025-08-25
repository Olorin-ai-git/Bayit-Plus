# Gaia Server Integration Gap Plan — Olorin Backend

Date: 2025-02-01
Status: Draft → To Implement
Owner: Platform/Backend
Scope: Compare Gaia `gaia-server` agents/services to Olorin `olorin-server`; close functional gaps with a phased plan.

## Requirements & Goals
- Unify agent orchestration and LLM risk assessment behaviors across projects
- Reuse proven components from Gaia where they improve reliability, observability, or UX
- Preserve Olorin-specific headers, auth, and configs; avoid breaking existing APIs

## High-level Comparison (Gaia → Olorin)
- Base LLM risk service
  - Gaia: `PromptAPIClient` to fetch prompts by name/version; `IntuitHeader` metadata
  - Olorin: Inline/system prompt templates; `OlorinHeader`; Pydantic schema injection
- Agents & tools
  - Gaia: `tool_registry.py`, `integrated_tool_service.py`, richer labels and audit services
  - Olorin: Agent framework and tools exist; fewer centralized registries; verification LLM added
- Services present in Gaia only (or more mature)
  - `audit_service.py`, `labels_service.py`, `enhanced_auth.py`, `enhanced_websocket_manager.py`
  - Evaluations/monitoring under `service/evaluation/`, `telemetry/`, security monitoring

## Prioritized Gaps to Address
1) Prompt Registry Integration (optional feature)
   - Add support to fetch versioned prompts (Gaia-style) behind a feature flag; fallback to local templates
2) Tool Registry and Integration Surface
   - Introduce a small `tool_registry` abstraction to enumerate/enable tools per environment
3) Audit & Labels
   - Add minimal audit logging service and label attachment utilities for LLM outputs
4) WebSocket/Realtime Enhancements
   - Review Gaia’s `enhanced_websocket_manager` for reconnect/backpressure patterns; port improvements
5) Verification Telemetry & Security Monitoring
   - Leverage Gaia evaluation/monitoring patterns to enhance verification metrics and dashboards

## Architecture Considerations
- Keep Olorin headers (`OlorinHeader`) and config; add adapters for Gaia components where needed
- Ensure new services are optional and gated via config; no impact to existing routes by default
- Centralize feature flags in `SvcSettings` and expose in `/admin/*` endpoints

## Implementation Strategy (Phased)
- Phase 0: Repo hygiene
  - Add `Gaia/` to `.gitignore` to exclude external sources from commits
- Phase 1: Prompt registry (opt-in)
  - `utils/prompt_api_client.py` (lightweight) + `settings` for base URL/token
  - Extend `BaseLLMRiskService` to optionally source system prompts by `prompt_name`
- Phase 2: Tool registry
  - Add `service/tools/tool_registry.py` with simple enable/disable and discovery APIs
  - Wire into agents that discover tools dynamically (no behavior change if disabled)
- Phase 3: Audit/Labels
  - Add `service/audit_service.py` (in-memory or DB-backed later)
  - Add `labels_service.py` for tagging risk assessments, expose via admin endpoint
- Phase 4: WebSocket improvements
  - Port critical reconnection/backpressure logic; feature-flag rollout
- Phase 5: Observability
  - Extend verification stats (pass rate, p95) with counters/SLIs; expose `/admin/verification/stats` details

## Detailed Steps
1) Config
   - Add flags: `use_prompt_registry`, `prompt_registry_url`, `prompt_registry_token`
   - Add `tool_registry_enabled`, `audit_enabled`, `labels_enabled`, `ws_enhanced_enabled`
2) Prompt Client
   - Create client with GET-by-name/version; integrate into base LLM path when enabled
3) Base LLM Integration
   - Add `get_prompt_name()` optional method; default falls back to current templates
4) Tool Registry
   - Registry structure `{name, enabled, config}`; load from YAML/env; expose `/admin/tools`
5) Audit & Labels
   - Minimal models and storage (in-memory to start); record LLM decisions, labels per assessment
6) WebSocket Manager
   - Port retry/backoff constants; add metrics on dropped messages and queue sizes
7) Telemetry
   - Unify metrics export for verification/audit/tool usage; extend existing stats endpoint

## Dependencies
- Optional: Prompt registry credentials/URL
- No new third-party dependencies mandatory for v1 (schema validation remains optional)

## Risks & Mitigations
- Integration complexity: Gate new features with flags; default-off
- Latency increase: Keep registry calls cached; fall back to local templates on failure
- Scope creep: Implement minimal viable versions; iterate with metrics

## Rollout Plan
- Stage 1: Feature flags default-off; deploy
- Stage 2: Enable in staging with shadow usage (no behavior change)
- Stage 3: Gradual enablement in production per component; monitor metrics

## Definition of Done
- New flags present and default-off; server boots cleanly
- Optional prompt registry works; fallbacks verified
- Tool registry lists tools; no-breaking changes
- Audit/labels endpoints return data when enabled
- WebSocket enhancements guarded and measurable
- Docs updated in `project-management` and admin endpoints visible
