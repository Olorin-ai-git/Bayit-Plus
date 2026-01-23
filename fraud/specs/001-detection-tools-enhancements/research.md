# Research: Detection Tools Enhancements

**Feature**: Detection Tools Enhancements  
**Date**: 2025-01-XX  
**Status**: Complete

## Overview

This research document synthesizes findings from the precision detection enhancement plan, existing tools audit, and implementation guarantee to inform the design and implementation of precision-focused detection tools for domain agents.

## Key Findings

### 1. Existing Infrastructure (Reuse Strategy)

**MaxMind Client** (`app/service/ip_risk/maxmind_client.py`):
- **Status**: Production-ready (510 lines)
- **Capabilities**: Real-time IP risk scoring, proxy/VPN/TOR detection, caching, rate limiting
- **Extension Needed**: Add `batch_score_ips()` method for batch enrichment operations
- **Reuse Pattern**: Extend existing class, reuse `score_ip()` method

**IPQS Email Tool** (`app/service/agent/tools/ipqs_email_tool.py`):
- **Status**: Complete (201 lines, no stubs)
- **Capabilities**: Email verification, fraud scoring, domain analysis, SMTP validation
- **Extension Needed**: Add batch enrichment wrapper (reuse existing `_run()` method)
- **Reuse Pattern**: Import tool, call `_run()` in batch loop

**Veriphone Tool** (`app/service/agent/tools/veriphone_tool.py`):
- **Status**: Complete (161 lines, no stubs, integrated via Composio)
- **Capabilities**: Phone verification, carrier lookup, line type detection
- **Extension Needed**: Add batch enrichment wrapper (reuse existing Composio integration)
- **Reuse Pattern**: Import tool, call `_run()` in batch loop

**Neo4j Client** (`app/service/graph/neo4j_client.py`):
- **Status**: Basic implementation (206 lines)
- **Capabilities**: Cypher query execution, entity loading
- **Extension Needed**: Add GDS algorithm execution methods (components, PageRank, shortest path)
- **Reuse Pattern**: Extend existing class, add GDS Cypher queries

**Composio Client** (`app/service/composio/client.py`):
- **Status**: Production-ready (425 lines)
- **Capabilities**: OAuth, action execution, Veriphone integration
- **Reuse Pattern**: Already used by Veriphone tool, no changes needed

### 2. Missing Infrastructure (Create Strategy)

**BIN Lookup Tool**:
- **Status**: Does not exist
- **Requirements**: Mastercard BIN Lookup API or Neutrino BIN Lookup
- **Implementation**: Create Composio Custom Tool
- **Features**: Issuer country, card type (prepaid/commercial/debit/credit), issuer name, geo mismatch flags

**Emailage Tool** (LexisNexis):
- **Status**: Does not exist (different from IPQS Email)
- **Requirements**: LexisNexis Emailage API
- **Implementation**: Create Composio Custom Tool (optional)
- **Features**: Email risk score, domain age, identity signals

**TeleSign Tool**:
- **Status**: Does not exist (optional alternative to Veriphone)
- **Requirements**: TeleSign PhoneID API
- **Implementation**: Create Composio Custom Tool (optional)
- **Features**: Phone carrier, type, validity, risk score

**Address Verification Tool**:
- **Status**: Does not exist
- **Requirements**: Lob AV or Melissa Global Address API
- **Implementation**: Create Composio Custom Tool
- **Features**: Address standardization, billing/shipping mismatch detection

### 3. Precision Detection Architecture

**Data Flow**:
1. **Snowflake** (Source of Truth) → Extract mature transactions (≥6 months old, ≥14 days matured)
2. **ETL Pipeline** → Load to PostgreSQL `pg_transactions` table
3. **Feature Engineering** → Compute precision features via materialized views:
   - Merchant burst detection (`is_burst_cardtest`, `z_unique_cards_30d`)
   - Peer-group outliers (`z_night`, `z_refund`)
   - Transaction-level deviations (`z_amt_card`, `is_first_time_card_merchant`)
   - Graph features (`prior_merchants_for_card`, component fraud rates)
   - Trailing merchant features (`refund_rate_30d_prior`, `cb_rate_90d_prior`)
4. **External Enrichment** → Batch enrich with graph analytics, BIN lookup, IP risk, email/phone
5. **Model Training** → Train XGBoost/LightGBM with calibration
6. **Domain Agent Integration** → Query PrecisionFeatureService for features and scores

**Key Tables**:
- `pg_transactions`: Denormalized transaction data from Snowflake
- `pg_merchants`: Aggregated merchant metadata for peer-group comparisons
- `labels_truth`: Ground-truth labels from mature transaction outcomes
- `pg_enrichment_scores`: External enrichment data (graph, BIN, IP, email, phone)
- `pg_alerts`: Model scores and thresholds
- `mv_features_txn`: Materialized view assembling all features

### 4. Constitutional Compliance Requirements

**Zero Duplication Policy**:
- All code must reuse existing infrastructure
- Extend existing services rather than creating duplicates
- Document reuse strategy for each component

**Zero Stubs/Mocks Policy**:
- Complete implementations only (except demo/test files)
- No TODO comments in production code
- No placeholder implementations

**Zero Fallback Values Policy**:
- If real data doesn't exist, fail gracefully with clear errors
- Store NULL values, don't use defaults
- Log specific reasons for missing data

**Quality Standards**:
- 87%+ test coverage minimum
- All files <200 lines
- All configuration from environment/config files
- Server must start and all endpoints must work

### 5. Performance Requirements

**ETL Pipeline**:
- Extract and load 1M transactions: <30 minutes
- Feature view refresh: <5 minutes for 1M transactions

**Enrichment Pipeline**:
- Batch enrichment (graph, BIN, IP, email, phone): <2 hours for 100K transactions

**Model Training**:
- Train XGBoost with 50+ features: <1 hour for 1M transactions
- Target AUC: >0.85

**Feature Lookup**:
- PrecisionFeatureService query: <100ms per transaction

### 6. Integration Points

**Domain Agents** (5 agents in scope for US4, others mentioned for context):
- **Merchant Agent**: Merchant burst signals (`is_burst_cardtest`, `z_unique_cards_30d`) - **IN SCOPE**
- **Network Agent**: Graph features (component fraud rate, shortest path to fraud) - **IN SCOPE**
- **Risk Agent**: Calibrated model scores - **IN SCOPE**
- **Location Agent**: Issuer geo mismatch flags, IP risk scores - **IN SCOPE**
- **Device Agent**: Card-testing patterns - **IN SCOPE**
- Logs Agent: Transaction deviation features (mentioned for context, not in US4 scope)
- Authentication Agent: Email/phone risk scores (mentioned for context, not in US4 scope)

**PrecisionFeatureService**:
- `get_transaction_features(txn_id)`: Retrieve all features for a transaction
- `get_merchant_burst_signals(merchant_id, date)`: Retrieve merchant burst signals
- `get_model_score(txn_id)`: Retrieve calibrated model score

## Technical Decisions

### 1. Batch Enrichment Strategy

**Decision**: Reuse existing tools with batch wrappers rather than creating new batch APIs.

**Rationale**:
- Existing tools are production-ready and tested
- Batch wrappers are simpler than new batch APIs
- Maintains consistency with existing tool patterns

**Implementation**:
- MaxMind: Extend client with `batch_score_ips()` method (reuses `score_ip()`)
- IPQS Email: Batch wrapper that calls `_run()` in loop
- Veriphone: Batch wrapper that calls `_run()` in loop

### 2. Graph Analytics Integration

**Decision**: Use Neo4j Graph Data Science (GDS) for graph feature computation.

**Rationale**:
- Neo4j client already exists
- GDS provides proven algorithms (components, PageRank, shortest path)
- Batch export/import pattern fits ETL workflow

**Implementation**:
- Export transaction graph from Snowflake to Neo4j
- Run GDS algorithms (components, PageRank, shortest path)
- Export features back to PostgreSQL

### 3. Model Training Approach

**Decision**: XGBoost with isotonic/Platt calibration for accurate probability estimates.

**Rationale**:
- XGBoost provides high performance on tabular data
- Calibration ensures accurate probability estimates for precision@K tuning
- Temporal split prevents data leakage

**Implementation**:
- Train on older data, validate on newer data
- Apply isotonic or Platt calibration
- Store calibrated scores in `pg_alerts` table

### 4. Feature Storage Strategy

**Decision**: Materialized views for fast feature lookup, PostgreSQL tables for persistence.

**Rationale**:
- Materialized views enable fast feature assembly
- PostgreSQL tables provide persistence and indexing
- Refresh strategy supports incremental updates

**Implementation**:
- Core tables: `pg_transactions`, `pg_merchants`, `labels_truth`, `pg_enrichment_scores`, `pg_alerts`
- Materialized views: `mv_merchant_day`, `mv_burst_flags`, `mv_peer_flags`, `mv_features_txn`
- Refresh views after ETL and enrichment

## Risks and Mitigations

### Risk 1: Missing Enrichment Data

**Risk**: Transactions may not have IP addresses, emails, or phone numbers.

**Mitigation**: 
- Skip enrichment for missing fields
- Store NULL values (no fallback)
- Log warnings for missing data

### Risk 2: External API Failures

**Risk**: MaxMind, BIN lookup, or other APIs may fail during batch enrichment.

**Mitigation**:
- Implement retry logic with exponential backoff
- Skip failed enrichments, continue with others
- Log errors with transaction IDs for reprocessing

### Risk 3: Neo4j GDS Not Available

**Risk**: Neo4j GDS library may not be installed or configured.

**Mitigation**:
- Check GDS availability before running algorithms
- Skip graph enrichment if GDS unavailable
- Log warning and continue with other enrichments

### Risk 4: Insufficient Training Data

**Risk**: Less than 1000 transactions available for model training.

**Mitigation**:
- Validate data size before training
- Fail gracefully with clear error message
- Document minimum data requirements

### Risk 5: Concurrent ETL Runs

**Risk**: Multiple ETL processes may run simultaneously, causing conflicts.

**Mitigation**:
- Use database transactions for atomicity
- Implement locking mechanism for ETL runs
- Handle conflicts gracefully with clear error messages

## Open Questions

1. **BIN Lookup Provider**: Should we use Mastercard BIN Lookup API or Neutrino BIN Lookup? (Decision: Support both, configurable)
2. **Emailage vs IPQS**: Do we need both Emailage and IPQS Email tools? (Decision: IPQS exists, Emailage optional)
3. **TeleSign vs Veriphone**: Do we need both TeleSign and Veriphone? (Decision: Veriphone exists, TeleSign optional)
4. **Graph Database**: Should we use Neo4j GDS or TigerGraph? (Decision: Neo4j GDS, client exists)
5. **Model Calibration**: Isotonic or Platt calibration? (Decision: Support both, configurable)

## References

- Precision Detection Enhancement Plan: `docs/plans/precision-detection-enhancement-plan.md`
- Implementation Guarantee: `docs/plans/precision-detection-implementation-guarantee.md`
- Existing Tools Audit: `docs/plans/precision-detection-existing-tools-audit.md`
- Feature Specification: `specs/001-detection-tools-enhancements/spec.md`

## Next Steps

1. **Phase 1: Design** - Create data model, contracts, and quickstart guide
2. **Phase 2: Tasks** - Break down implementation into specific tasks
3. **Implementation** - Begin with P1 (feature engineering) as foundation

