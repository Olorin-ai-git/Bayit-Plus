# Feature Specification: Detection Tools Enhancements

**Feature Branch**: `001-detection-tools-enhancements`  
**Created**: 2025-01-XX  
**Status**: Draft  
**Input**: User description: "detection tools enhancements. use the prepared plan and research"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Precision-Focused Feature Engineering (Priority: P1)

Domain agents need access to high-precision detection features derived from historical transaction data to identify fraud patterns beyond generic anomalies. The system should extract mature transactions (≥6 months old, ≥14 days matured) from Snowflake, engineer precision-focused features (merchant burst detection, peer-group outliers, transaction-level deviations, graph features), and make them available to domain agents via PostgreSQL materialized views.

**Why this priority**: This is the foundation of the precision detection system. Without these features, domain agents cannot access the high-signal detection capabilities that deliver much higher precision than generic anomaly detection. This directly addresses the core requirement of retro-only, precision-focused fraud detection.

**Independent Test**: Can be fully tested by running the ETL pipeline to extract mature transactions from Snowflake, building feature engineering materialized views in PostgreSQL, and verifying that domain agents can query these features via the PrecisionFeatureService. Delivers immediate value by enabling domain agents to detect card-testing bursts, peer-group anomalies, and transaction deviations.

**Acceptance Scenarios**:

1. **Given** mature transactions exist in Snowflake (≥6 months old, ≥14 days matured), **When** ETL pipeline runs, **Then** transactions are loaded into `pg_transactions` table with all required fields
2. **Given** transactions are loaded in PostgreSQL, **When** feature engineering views are refreshed, **Then** merchant burst flags (`is_burst_cardtest`, `z_unique_cards_30d`) are calculated correctly
3. **Given** merchant metadata exists, **When** peer-group comparisons are computed, **Then** peer-group outlier flags (`z_night`, `z_refund`) are available in `mv_peer_flags`
4. **Given** transaction history exists, **When** transaction-level features are computed, **Then** card/merchant deviation features (`z_amt_card`, `is_first_time_card_merchant`, `sec_since_prev_for_card`) are available
5. **Given** graph relationships exist, **When** graph features are computed, **Then** graph features (`prior_merchants_for_card`, component fraud rates) are available in `mv_txn_graph_feats`
6. **Given** merchant refund/chargeback history exists, **When** trailing merchant features are computed, **Then** precursor features (`refund_rate_30d_prior`, `cb_rate_90d_prior`) are available

---

### User Story 2 - External Data Enrichment Integration (Priority: P2)

Domain agents need enriched transaction data from external sources (graph analytics, BIN lookup, IP risk, email/phone intelligence) to improve detection precision. The system should batch-enrich transactions using existing tools (MaxMind, IPQS Email, Veriphone) and new tools (BIN lookup, Emailage, TeleSign, Address verification) via Composio Custom Tools, storing enrichment scores in PostgreSQL for feature assembly.

**Why this priority**: External enrichment provides the biggest precision lift, especially graph analytics and BIN lookup. This enables detection of fraud rings, issuer-country mismatches, and proxy/VPN usage patterns that are not visible in transaction data alone. Reusing existing tools (MaxMind, IPQS Email, Veriphone) prevents duplication while extending them for batch operations.

**Independent Test**: Can be fully tested by running the enrichment pipeline on a batch of transactions, verifying that graph features (component fraud rate, shortest path to fraud) are computed via Neo4j GDS, BIN lookup returns issuer country/type, IP risk scores are computed via MaxMind batch method, and email/phone enrichment uses existing tools. Delivers immediate value by enabling detection of fraud rings, geo mismatches, and proxy usage.

**Acceptance Scenarios**:

1. **Given** transactions are loaded in PostgreSQL, **When** graph analytics enrichment runs, **Then** graph features (component fraud rate, shortest path to fraud, shared-card pressure, PageRank) are stored in `pg_enrichment_scores`
2. **Given** transactions have card BIN codes, **When** BIN lookup enrichment runs, **Then** issuer country, card type, issuer name, and mismatch flags are stored in `pg_enrichment_scores`
3. **Given** transactions have IP addresses, **When** IP risk enrichment runs (using extended MaxMind client), **Then** IP risk scores, proxy/VPN/TOR flags, and datacenter flags are stored in `pg_enrichment_scores`
4. **Given** transactions have email addresses, **When** email enrichment runs (using existing IPQS Email tool), **Then** email risk scores, domain age, and validity flags are stored in `pg_enrichment_scores`
5. **Given** transactions have phone numbers, **When** phone enrichment runs (using existing Veriphone tool), **Then** phone carrier, type, and validity flags are stored in `pg_enrichment_scores`
6. **Given** enrichment scores exist, **When** feature view is refreshed, **Then** enrichment features are included in `mv_features_txn` materialized view

---

### User Story 3 - Calibrated Model Training and Scoring (Priority: P3)

The system should train a supervised fraud detection model using XGBoost (LightGBM support deferred to future enhancement) with precision-focused features and mature ground-truth labels, calibrate the model for accurate probability estimates, and score all transactions with calibrated probabilities. Model scores should be stored in PostgreSQL and made available to domain agents for risk assessment.

**Why this priority**: A calibrated model provides accurate fraud probability estimates that can be used for precision@K threshold tuning. This enables domain agents to prioritize investigations based on calibrated risk scores rather than raw model outputs. The model combines precise rules with supervised learning for optimal precision.

**Independent Test**: Can be fully tested by training the model on historical features and labels, verifying calibration improves probability accuracy, scoring all transactions, and confirming scores are stored in `pg_alerts` table. Delivers immediate value by providing calibrated fraud probability estimates for investigation prioritization.

**Acceptance Scenarios**:

1. **Given** feature vectors and ground-truth labels exist, **When** model training runs, **Then** XGBoost model is trained with temporal split (train on older data, validate on newer data)
2. **Given** trained model exists, **When** calibration runs, **Then** isotonic calibration is applied by default (Platt calibration available via configuration), and calibrated probabilities are accurate
3. **Given** calibrated model exists, **When** scoring runs, **Then** all transactions are scored and scores are stored in `pg_alerts` table
4. **Given** model scores exist, **When** domain agents query features, **Then** model scores are available via PrecisionFeatureService

---

### User Story 4 - Domain Agent Integration (Priority: P4)

Domain agents (Network, Device, Location, Merchant, Risk) should be enhanced to use precision-focused features and model scores in their risk assessments. Agents should query PrecisionFeatureService to retrieve features and scores, incorporate them into their findings, and use them to compute algorithmic risk scores.

**Why this priority**: This completes the integration by enabling domain agents to leverage precision features in their investigations. Without this, the features and model scores exist but are not used by agents, providing no value to end users.

**Independent Test**: Can be fully tested by running a domain agent investigation, verifying that the agent queries PrecisionFeatureService for features, incorporates merchant burst signals and model scores into findings, and computes risk scores using precision features. Delivers immediate value by enabling agents to detect fraud patterns they could not detect before.

**Acceptance Scenarios**:

1. **Given** precision features exist in PostgreSQL, **When** Merchant Agent runs investigation, **Then** agent queries PrecisionFeatureService and retrieves merchant burst signals (`is_burst_cardtest`, `z_unique_cards_30d`)
2. **Given** precision features exist, **When** Network Agent runs investigation, **Then** agent retrieves graph features (component fraud rate, shortest path to fraud) and incorporates them into findings
3. **Given** model scores exist, **When** Risk Agent runs investigation, **Then** agent retrieves calibrated model score and incorporates it into risk assessment
4. **Given** enrichment features exist, **When** Location Agent runs investigation, **Then** agent retrieves issuer geo mismatch flags and IP risk scores for location analysis
5. **Given** precision features exist, **When** Device Agent runs investigation, **Then** agent retrieves card-testing pattern features (`is_burst_cardtest`, `z_unique_cards_30d`) and incorporates them into findings
6. **Given** precision features are retrieved, **When** agent computes algorithmic risk score, **Then** risk score incorporates precision features (no fallback values, fails gracefully if data missing)

---

### Edge Cases

- What happens when no mature transactions exist in Snowflake (less than 6 months old)? System should skip ETL and log warning, but not fail
- How does system handle missing enrichment data (e.g., no IP address, no email)? System should skip enrichment for missing fields, store NULL values, and not use fallback values
- What happens when MaxMind API fails during batch enrichment? System should log error, skip IP enrichment for failed batch, and continue with other enrichments (no fallback scores)
- How does system handle Neo4j GDS not being available? System should skip graph enrichment, log warning, and continue with other enrichments
- What happens when BIN lookup API returns no data? System should store NULL values, not use fallback issuer country/type
- How does system handle model training with insufficient data (e.g., <1000 transactions)? System should fail gracefully with clear error message, not train model with insufficient data
- What happens when PrecisionFeatureService query returns no features for a transaction? System should return None, not use fallback features
- How does system handle concurrent ETL runs? System should use database transactions and handle conflicts gracefully

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST extract mature transactions (≥6 months old, ≥14 days matured) from Snowflake `TRANSACTIONS_ENRICHED` table
- **FR-002**: System MUST load extracted transactions into PostgreSQL `pg_transactions` table with all required fields (txn_id, txn_ts, merchant_id, card_id, amount, currency, etc.)
- **FR-003**: System MUST build ground-truth labels (`labels_truth` table) from mature transaction outcomes (IS_FRAUD_TX, DISPUTE_FINAL_OUTCOME, CHARGEBACK_DATE)
- **FR-004**: System MUST compute merchant burst detection features (`is_burst_cardtest`, `z_unique_cards_30d`, `tiny_amt_rate`) via materialized views
- **FR-005**: System MUST compute peer-group outlier features (`z_night`, `z_refund`) comparing merchants within same MCC×region×size cohort
- **FR-006**: System MUST compute transaction-level deviation features (`z_amt_card`, `is_first_time_card_merchant`, `sec_since_prev_for_card`)
- **FR-007**: System MUST compute graph features (`prior_merchants_for_card`, component fraud rates) using Neo4j GDS algorithms
- **FR-008**: System MUST compute trailing merchant features (`refund_rate_30d_prior`, `cb_rate_90d_prior`) for refund/chargeback precursors
- **FR-009**: System MUST batch-enrich transactions with graph analytics features (component fraud rate, shortest path to fraud, shared-card pressure, PageRank) using Neo4j GDS
- **FR-010**: System MUST batch-enrich transactions with BIN lookup data (issuer country, card type, issuer name) using Composio Custom Tool (Mastercard/Neutrino API)
- **FR-011**: System MUST batch-enrich transactions with IP risk scores using extended MaxMind client (reuse existing `maxmind_client.py`, add `batch_score_ips()` method)
- **FR-012**: System MUST batch-enrich transactions with email risk scores using existing IPQS Email tool (reuse `ipqs_email_tool.py`, add batch wrapper)
- **FR-013**: System MUST batch-enrich transactions with phone intelligence using existing Veriphone tool (reuse `veriphone_tool.py`, add batch wrapper)
- **FR-014**: System MUST store all enrichment scores in `pg_enrichment_scores` table with proper indexes
- **FR-015**: System MUST assemble all features (original + enrichment) into `mv_features_txn` materialized view
- **FR-016**: System MUST train XGBoost model using precision features and ground-truth labels with temporal split (LightGBM support deferred to future enhancement)
- **FR-017**: System MUST calibrate trained model using isotonic calibration by default, with Platt calibration available via configuration, for accurate probability estimates
- **FR-018**: System MUST score all transactions with calibrated model and store scores in `pg_alerts` table
- **FR-019**: System MUST provide PrecisionFeatureService for domain agents to query features and model scores
- **FR-020**: Domain agents MUST be able to query PrecisionFeatureService to retrieve transaction features, merchant burst signals, and model scores
- **FR-021**: Domain agents MUST incorporate precision features into their findings and risk assessments
- **FR-022**: System MUST handle missing enrichment data gracefully (store NULL, no fallback values)
- **FR-023**: System MUST fail gracefully with clear error messages when required data is missing (no fallback values)
- **FR-024**: System MUST reuse existing infrastructure (MaxMind client, IPQS Email tool, Veriphone tool, Neo4j client, Composio client) without duplication
- **FR-025**: System MUST extend existing services (add batch methods) rather than creating duplicate implementations
- **FR-026**: System MUST NOT contain any stubs, mocks, TODOs, or fallback values in production code (except demo/test files)
- **FR-027**: System MUST load all configuration from environment variables or config files (no hardcoded values)
- **FR-028**: System MUST maintain 87%+ test coverage for all new code
- **FR-029**: System MUST keep all files under 200 lines (modular, maintainable code)
- **FR-030**: System MUST schedule ETL pipeline to run daily for incremental updates

### Key Entities *(include if feature involves data)*

- **pg_transactions**: Denormalized transaction data from Snowflake, includes txn_id, txn_ts, merchant_id, card_id, amount, currency, and final outcomes (is_fraud_final, dispute_final_outcome, chargeback_ts)
- **pg_merchants**: Aggregated merchant metadata including merchant_id, mcc, region, avg_monthly_txn, signup_date for peer-group comparisons
- **labels_truth**: Ground-truth labels built from mature transaction outcomes, includes txn_id, is_fraud (final outcome), label_maturity_days, label_source
- **pg_enrichment_scores**: External enrichment data including graph features (component_fraud_rate, shortest_path_to_fraud), BIN lookup (issuer_country, card_type), IP risk (ip_risk_score, ip_proxy_detected), email/phone intelligence (email_risk_score, phone_carrier), references pg_transactions(txn_id)
- **pg_alerts**: Model scores and thresholds, includes txn_id, model_score (calibrated probability), threshold_cohort, precision_at_k, references pg_transactions(txn_id)
- **mv_features_txn**: Materialized view assembling all features (original + enrichment) for model training and domain agent queries, includes txn_id and all feature columns from various materialized views and pg_enrichment_scores

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ETL pipeline successfully extracts and loads mature transactions (≥6 months old) from Snowflake to PostgreSQL within 30 minutes for 1M transactions
- **SC-002**: Feature engineering materialized views refresh within 5 minutes for 1M transactions, enabling real-time feature lookup
- **SC-003**: Enrichment pipeline completes batch enrichment (graph, BIN, IP, email, phone) within 2 hours for 100K transactions
- **SC-004**: Model training completes within 1 hour for 1M transactions with 50+ features, producing calibrated model with AUC > 0.85
- **SC-005**: PrecisionFeatureService queries return feature vectors within 100ms for single transaction lookup
- **SC-006**: Domain agents successfully incorporate precision features into 90%+ of investigations where features are available
- **SC-007**: Precision@K metrics show 2x improvement over generic anomaly detection (e.g., precision@1000 improves from 0.15 to 0.30)
- **SC-008**: Zero duplication of existing infrastructure (MaxMind client, IPQS Email tool, Veriphone tool, Neo4j client, Composio client)
- **SC-009**: Zero stubs, mocks, TODOs, or fallback values in production code (verified by automated scan)
- **SC-010**: All new code maintains 87%+ test coverage with all tests passing
- **SC-011**: Server starts successfully and all endpoints respond correctly after implementation
- **SC-012**: ETL pipeline runs daily without errors, incrementally updating features and model scores
