# Feature Specification: Composio Tools Integration

**Feature Branch**: `001-composio-tools-integration`  
**Created**: 2025-01-31  
**Status**: Draft  
**Input**: User description: "Composio tools integration: Here's how I'd level up an anomaly-centric fraud platform with concrete tools (and exactly where they fit)."

## Clarifications

### Session 2025-01-31

- Q: Which device fingerprint SDK should be used (Fingerprint Pro, SEON, or IPQS)? → A: Support multiple SDKs - Allow tenant configuration to choose their preferred SDK
- Q: What encryption standard should be used for at-rest encryption of Composio connection credentials? → A: AES-256-GCM with cloud provider key management (AWS KMS/GCP KMS/Azure Key Vault)
- Q: Which graph database should be used (Neo4j or TigerGraph)? → A: Support both - Allow configuration to choose Neo4j or TigerGraph per tenant or environment

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tenant Onboarding with BYOC (Bring Your Own Credentials) (Priority: P1)

A fraud platform customer (tenant) needs to connect their own SaaS accounts (Stripe, Shopify, Okta, Slack, Jira) to enable automated fraud response actions. The system provides a unified OAuth flow through Composio where each tenant authorizes their own accounts, and these connections are securely stored and isolated per tenant. Once connected, fraud detection agents and SOAR playbooks can execute actions (refund, void, cancel, step-up MFA, notify) against the tenant's connected tools without requiring per-tool OAuth implementations.

**Why this priority**: Foundation for all automated response capabilities. Without tenant-scoped connections, the system cannot execute actions on behalf of customers. This is the critical first step that unlocks all downstream automation.

**Independent Test**: Can be fully tested by creating a tenant, initiating OAuth flow for Stripe via Composio, verifying connection is stored with tenant isolation, and executing a test action (e.g., retrieve account balance). Delivers immediate value by enabling tenant self-service integration setup.

**Acceptance Scenarios**:

1. **Given** a new tenant account exists, **When** tenant navigates to integrations page and clicks "Connect Stripe", **Then** system redirects to Composio OAuth flow, tenant authorizes, and connection is stored with tenant_id scope
2. **Given** tenant has connected Stripe account, **When** system executes `stripe_get_account` action via Composio, **Then** action executes against tenant's connected account and returns account data
3. **Given** tenant has multiple connected tools (Stripe, Shopify, Okta), **When** tenant views integrations page, **Then** system displays all connected tools with connection status and last used timestamp
4. **Given** tenant revokes OAuth connection, **When** system attempts to execute action via Composio, **Then** system returns authentication error and prompts tenant to reconnect

---

### User Story 2 - Real-Time Device Fingerprinting at Checkout (Priority: P1)

A fraud detection system needs to capture device intelligence signals (device fingerprint, browser characteristics, behavioral patterns) during critical user interactions (signup, login, checkout) to detect ATO (Account Takeover), tumbling, velocity abuse, and duplicate account patterns. The system supports multiple device fingerprint SDKs (Fingerprint Pro, SEON, or IPQS) with tenant-configurable selection. The selected SDK captures device_id and confidence signals, persists them to Snowflake for feature engineering, and mirrors detection events to Splunk for real-time alerting.

**Why this priority**: Device intelligence is a critical signal for fraud detection. Without device fingerprinting, the system cannot detect multi-accounting, device sharing, or ATO patterns effectively. This directly improves catch rates for common fraud vectors.

**Independent Test**: Can be fully tested by embedding device SDK in a test checkout page, capturing a transaction with device signals, verifying device_id and signals are written to Snowflake `device_signals` table, and confirming detection events appear in Splunk. Delivers immediate value by enabling device-based fraud detection.

**Acceptance Scenarios**:

1. **Given** user initiates checkout transaction, **When** device SDK captures device fingerprint, **Then** device_id, confidence_score, browser_fingerprint, and behavioral_signals are sent to backend and persisted to Snowflake
2. **Given** device signals are captured for transaction, **When** anomaly detection runs, **Then** device-based features (shared_device_count computed from device_signals aggregation, device_age computed from first_seen timestamp, device_risk_score computed from device features) are available in feature set via SQL views/functions and `features_curated` Dynamic Table
3. **Given** same device_id appears across multiple user accounts, **When** investigation agent analyzes transactions, **Then** system flags potential multi-accounting or device sharing pattern
4. **Given** device SDK fails to capture fingerprint, **When** transaction is processed, **Then** system logs warning but continues processing with device_id set to NULL

---

### User Story 3 - IP Risk Scoring Before Authorization (Priority: P1)

A fraud detection system needs to evaluate IP and transaction risk scores (via MaxMind minFraud or similar) immediately before payment authorization to prevent fraudulent transactions. The system calls IP risk service, receives risk score and insights (proxy/VPN detection, geolocation mismatch, velocity signals), writes scores into the feature set for rule-based and ML-based detection, and uses scores to trigger automated responses for high-risk transactions.

**Why this priority**: IP risk scoring is a foundational fraud signal that catches proxy/VPN usage, geolocation anomalies, and velocity abuse. This must happen before authorization to prevent fraud losses. Critical for real-time fraud prevention.

**Independent Test**: Can be fully tested by sending a test transaction with IP address to MaxMind minFraud API, receiving risk score, verifying score is written to Snowflake `ip_risk_scores` table (which feeds into `features_curated` Dynamic Table), and confirming high-risk transactions trigger review workflow. Delivers immediate value by blocking fraudulent transactions before they complete.

**Acceptance Scenarios**:

1. **Given** transaction is received with IP address, **When** system calls MaxMind minFraud API before authorization, **Then** risk score (0-100), proxy/VPN flags, geolocation data, and velocity signals are returned and written to `ip_risk_scores` table (which feeds into `features_curated` Dynamic Table)
2. **Given** IP risk score exceeds threshold (e.g., >75), **When** transaction is evaluated, **Then** system triggers high-risk workflow (review, step-up, or block) before authorization completes
3. **Given** IP risk service is unavailable, **When** transaction is processed, **Then** system uses cached score if available, otherwise defaults to medium risk and logs service failure
4. **Given** geolocation mismatch detected (IP country ≠ billing country), **When** risk score is calculated, **Then** system increases risk score and flags transaction for manual review

---

### User Story 4 - Automated Fraud Response via SOAR + Composio (Priority: P2)

A fraud analyst needs automated response actions when anomalies or high-risk transactions are detected. The system uses Splunk SOAR playbooks to orchestrate evidence collection and containment, then executes enforcement actions via Composio toolkits (Stripe refund/void, Shopify cancel/tag, Okta force MFA, Slack/Jira notify+case) against the tenant's connected accounts. All actions are logged to Splunk and Snowflake for audit and investigation.

**Why this priority**: Enables automated fraud containment without manual intervention. Reduces time-to-action from hours to seconds, preventing fraud losses. Critical for high-volume fraud scenarios where manual response is too slow.

**Independent Test**: Can be fully tested by creating a SOAR playbook that triggers on high-risk anomaly, executes Stripe void action via Composio, sends Slack notification, and creates Jira case. Verify all actions execute successfully and outcomes are logged. Delivers immediate value by automating fraud response workflows.

**Acceptance Scenarios**:

1. **Given** critical anomaly is detected (severity=critical, score>4.5), **When** SOAR playbook triggers, **Then** system executes Stripe void authorization, Okta force MFA, Slack alert to #fraud-ops, and Jira case creation via Composio
2. **Given** SOAR playbook executes action via Composio, **When** action completes, **Then** system logs action result, updates investigation status, and writes outcome to Snowflake audit table
3. **Given** Composio action fails (e.g., Stripe API error), **When** SOAR playbook handles error, **Then** system retries with exponential backoff, logs failure, and escalates to manual review if retries exhausted
4. **Given** tenant has not connected required tool (e.g., Stripe), **When** SOAR playbook attempts action, **Then** system skips action, logs warning, and continues with other available actions

---

### User Story 5 - Real-Time Feature Pipeline with Snowpipe Streaming (Priority: P2)

A fraud detection system needs sub-minute feature freshness for real-time fraud detection. The system uses Snowflake Snowpipe Streaming to ingest events (clickstream, payments, auth logs) in seconds rather than batch hours, processes events through Dynamic Tables for declarative feature pipelines, and makes features available to detection models within minutes/seconds of event occurrence.

**Why this priority**: Enables real-time fraud detection by reducing feature latency from hours to seconds. Critical for detecting and responding to fraud before transactions complete. Without real-time features, detection is always reactive rather than proactive.

**Independent Test**: Can be fully tested by sending test transaction event to Kafka, verifying event appears in Snowflake via Snowpipe Streaming within 10 seconds, confirming Dynamic Table processes event to features table, and validating features are available for detection query. Delivers immediate value by enabling real-time fraud detection.

**Acceptance Scenarios**:

1. **Given** transaction event is published to Kafka topic, **When** Snowpipe Streaming ingests event, **Then** event appears in Snowflake staging table within 10 seconds
2. **Given** event is in staging table, **When** Dynamic Table processes event, **Then** curated features (device_signals, ip_risk_score, transaction_amount, etc.) are available in features_curated table within 30 seconds
3. **Given** Dynamic Table freshness target is 1 minute, **When** no new events arrive, **Then** Dynamic Table does not reprocess unnecessarily, maintaining efficiency
4. **Given** Snowpipe Streaming fails, **When** system detects failure, **Then** events are buffered in Kafka, system retries connection, and alerts operations team

---

### User Story 6 - Graph-Based Fraud Detection for Mule Rings (Priority: P3)

A fraud detection system needs to identify mule rings and synthetic identity webs by analyzing entity relationships (people, phones, emails, devices, cards, IPs). The system pushes entities to a configured graph database (Neo4j or TigerGraph), runs link-based features (shared devices, co-travel patterns, velocity across clusters), computes community risk scores, and feeds graph features back to Snowflake for ML model scoring and Splunk for triage.

**Why this priority**: Graph analysis detects sophisticated fraud patterns (mule rings, synthetic identities) that rule-based and statistical methods miss. This is advanced capability that significantly improves detection of organized fraud. Lower priority because it requires more infrastructure setup.

**Independent Test**: Can be fully tested by loading test entities (users, devices, cards) into the configured graph database (Neo4j or TigerGraph), running graph algorithms to detect clusters, computing shared device risk scores, exporting scores to Snowflake, and verifying scores are used in fraud detection models. Delivers value by detecting complex fraud networks.

**Acceptance Scenarios**:

1. **Given** entities (users, devices, cards, IPs) are loaded into the configured graph database (Neo4j or TigerGraph), **When** graph algorithms detect cluster of 5+ users sharing 2+ devices, **Then** system computes cluster_risk_score and shared_device_count features
2. **Given** graph features are computed, **When** features are exported to Snowflake, **Then** features are available in `graph_features` table and joinable with transaction data
3. **Given** high-risk cluster is detected (cluster_risk_score > 0.8), **When** investigation is created, **Then** system includes cluster members and graph visualization in investigation context
4. **Given** configured graph database (Neo4j or TigerGraph) is unavailable, **When** system attempts graph feature computation, **Then** system uses cached features if available, otherwise skips graph enrichment and logs warning

---

### Edge Cases

- What happens when Composio OAuth token expires? → System detects 401/403 error, invalidates connection, prompts tenant to re-authenticate, and queues pending actions for retry after reconnection
- How does system handle tenant with no connected tools? → SOAR playbooks skip actions requiring unavailable tools, log warnings, and continue with available actions (e.g., Splunk alerting, investigation creation)
- What happens when device SDK fails to load in browser? → System falls back to server-side device detection using User-Agent and IP signals, logs SDK failure, and continues processing with reduced device intelligence. If tenant's configured SDK fails, system attempts fallback to alternative SDK if available, otherwise uses server-side detection.
- How does system handle MaxMind API rate limits? → System implements request queuing, respects rate limits, uses cached scores for recent IPs, and falls back to internal IP reputation database if available
- What happens when Snowpipe Streaming falls behind? → System monitors lag metrics, alerts operations if lag exceeds threshold (e.g., >5 minutes), and can temporarily increase Snowpipe resources or fall back to batch ingestion
- How does system handle graph database (Neo4j or TigerGraph) overload? → System implements query timeouts, uses read replicas for graph queries (if supported by database), caches frequently accessed graph features, and degrades gracefully by skipping graph enrichment under load
- What happens when SOAR playbook action conflicts with manual action? → System checks for concurrent modifications, uses optimistic locking, and logs conflict for manual resolution
- How does system handle tenant data isolation in Composio? → System verifies tenant_id scope on all Composio API calls, implements connection-level isolation, and audits all actions with tenant context

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support tenant-scoped OAuth connections via Composio for Stripe, Shopify, Okta, Slack, Jira, Square Disputes, and other supported toolkits
- **FR-002**: System MUST store Composio connection credentials with tenant_id isolation and encryption at rest using AES-256-GCM algorithm with keys managed via cloud provider key management service (AWS KMS, GCP KMS, or Azure Key Vault)
- **FR-003**: System MUST provide unified Composio actions interface for executing tenant-scoped actions (refund, void, cancel, tag, step-up MFA, notify, case creation) without per-tool OAuth implementations
- **FR-004**: System MUST support multiple device fingerprint SDKs (Fingerprint Pro, SEON, or IPQS) with tenant-configurable SDK selection. System MUST capture device_id, confidence_score, browser_fingerprint, and behavioral_signals during signup/login/checkout flows using the tenant's configured SDK
- **FR-005**: System MUST persist device signals to Snowflake `device_signals` table with transaction_id linkage for feature engineering
- **FR-006**: System MUST mirror device detection events to Splunk for real-time alerting and investigation
- **FR-007**: System MUST call IP risk scoring service (MaxMind minFraud or equivalent) before payment authorization to evaluate transaction risk
- **FR-008**: System MUST write IP risk scores, proxy/VPN flags, geolocation data, and velocity signals to Snowflake feature set for detection models
- **FR-009**: System MUST integrate Splunk SOAR playbooks to orchestrate automated fraud response workflows (evidence collection, containment, enforcement)
- **FR-010**: System MUST execute SOAR playbook actions via Composio toolkits with tenant-scoped authentication
- **FR-011**: System MUST log all Composio actions (success/failure, tenant_id, action_type, parameters, outcome) to Splunk and Snowflake audit tables
- **FR-012**: System MUST implement Snowpipe Streaming for real-time event ingestion (clickstream, payments, auth logs) to Snowflake with sub-minute latency
- **FR-013**: System MUST use Snowflake Dynamic Tables for declarative feature pipelines with configurable freshness targets (e.g., 1 minute)
- **FR-014**: System MUST support graph database integration with both Neo4j and TigerGraph, allowing configuration to choose database per tenant or environment. System MUST provide entity relationship analysis (users, devices, cards, IPs, phones, emails) using the configured graph database.
- **FR-015**: System MUST compute graph-based features (shared_device_count, cluster_risk_score, co-travel_patterns, velocity_across_clusters) and export to Snowflake for ML model scoring
- **FR-016**: System MUST handle Composio API failures with retry logic (exponential backoff, max 3 retries) and graceful degradation (skip action, log warning, continue workflow)
- **FR-017**: System MUST validate tenant_id scope on all Composio API calls to prevent cross-tenant data access
- **FR-018**: System MUST provide tenant self-service UI for managing Composio connections (connect, disconnect, test connection, view connection status)
- **FR-021**: System MUST allow tenants to configure their preferred device fingerprint SDK (Fingerprint Pro, SEON, or IPQS) via tenant settings, with SDK selection applied to all device signal capture flows for that tenant
- **FR-022**: System MUST allow configuration of graph database (Neo4j or TigerGraph) per tenant or environment, with abstraction layer supporting both databases and consistent feature computation regardless of database choice
- **FR-019**: System MUST support SOAR playbook triggers based on anomaly severity, risk score thresholds, and entity types. Triggers are configured in Splunk SOAR directly; Olorin provides API endpoints to execute playbooks when triggers fire.
- **FR-020**: System SHOULD implement feature store consistency (online/offline features) using Feast with Snowflake backend [DEFERRED: Feast integration is a medium-term enhancement, not required for MVP. Dynamic Tables provide sufficient feature pipeline capabilities for Phase 1.]

### Key Entities *(include if feature involves data)*

- **ComposioConnection**: Represents a tenant's OAuth connection to an external tool via Composio. Attributes: tenant_id, toolkit_name (e.g., "stripe"), connection_id, status (active/expired/revoked), created_at, last_used_at, expires_at. Relationships: belongs to Tenant, used by SOARPlaybookActions
- **DeviceSignal**: Represents device fingerprinting data captured during user interactions. Attributes: device_id, transaction_id, user_id, tenant_id, confidence_score, browser_fingerprint, behavioral_signals (JSON), captured_at, sdk_provider (fingerprint_pro/seon/ipqs). Relationships: linked to Transaction, used by AnomalyDetection. Note: sdk_provider is determined by tenant's configured SDK preference.
- **IPRiskScore**: Represents IP and transaction risk evaluation results. Attributes: transaction_id, ip_address, risk_score (0-100), is_proxy, is_vpn, is_tor, geolocation_data (JSON), velocity_signals (JSON), scored_at, provider (maxmind/other). Relationships: linked to Transaction, used by FraudDetectionRules
- **SOARPlaybookExecution**: Represents execution of an automated fraud response playbook. Attributes: playbook_id, investigation_id, anomaly_id, tenant_id, trigger_reason, status (running/completed/failed), started_at, completed_at, actions_executed (JSON array). Relationships: triggers ComposioActions, linked to Investigation
- **ComposioAction**: Represents a single action executed via Composio toolkit. Attributes: action_id, execution_id, toolkit_name, action_name (e.g., "stripe_void_payment"), tenant_id, connection_id, parameters (JSON), result (JSON), status (success/failed/retrying), executed_at, retry_count. Relationships: belongs to SOARPlaybookExecution, uses ComposioConnection
- **GraphFeature**: Represents graph-based fraud detection features computed from entity relationships. Attributes: entity_id, entity_type, cluster_id, shared_device_count, cluster_risk_score, co_travel_patterns (JSON), velocity_across_clusters, computed_at, graph_provider (neo4j/tigergraph). Relationships: linked to Entity, used by MLModels
- **SnowpipeStreamingIngestion**: Represents real-time event ingestion via Snowpipe Streaming. Attributes: event_id, event_type (clickstream/payment/auth), source_topic, ingested_at, snowflake_table, processing_status. Relationships: feeds DynamicTablePipeline
- **DynamicTablePipeline**: Represents declarative feature pipeline using Snowflake Dynamic Tables. Attributes: table_name, source_tables (array), freshness_target (e.g., "1 minute"), last_refresh_at, refresh_status, feature_columns (JSON). Relationships: processes SnowpipeStreamingIngestion, produces FeatureSet

## Tool Integration Mapping *(mandatory)*

### Existing Threat Detection Tools → New Composio-Integrated Tools

#### IP Reputation & Risk Scoring

| Existing Tool | Current Capability | New Composio Tool | Integration Strategy |
|--------------|-------------------|-------------------|----------------------|
| `simple_ip_reputation` (AbuseIPDB) | IP abuse scoring, community reports | `maxmind_minfraud` (via Composio) | **Enhancement**: Add MaxMind minFraud as complementary source. AbuseIPDB remains for community-driven abuse reports; MaxMind adds transaction risk scoring, proxy/VPN detection, velocity signals |
| `bulk_ip_analysis` (AbuseIPDB) | Bulk IP reputation checks | `maxmind_minfraud` (batch mode) | **Enhancement**: Use MaxMind for transaction-level risk; AbuseIPDB for bulk historical analysis |
| `virustotal_ip_analysis` | IP malware scanning, threat intel | `maxmind_minfraud` + existing VirusTotal | **Complementary**: VirusTotal for malware/threat intel; MaxMind for transaction risk and geolocation |
| `shodan_infrastructure_analysis` | Infrastructure reconnaissance | Existing Shodan + `maxmind_minfraud` | **Complementary**: Shodan for infrastructure details; MaxMind for transaction risk scoring |

**Integration Approach**: MaxMind minFraud becomes the **primary** transaction risk scorer (called before authorization), while existing threat intel tools (AbuseIPDB, VirusTotal, Shodan) remain for **investigation and enrichment** phases.

#### Device Intelligence

| Existing Capability | Current Implementation | New Composio Tool | Integration Strategy |
|---------------------|------------------------|-------------------|----------------------|
| Device fingerprinting concept | Database column `DEVICE_FINGERPRINT` (MD5 hash) | `device_fingerprint_sdk` (Fingerprint Pro/SEON/IPQS) | **Replacement**: Replace basic MD5 hash with SDK-based device intelligence. SDK provides persistent device_id, confidence scores, behavioral signals, browser fingerprinting |
| Device analysis in Device Agent | Query-based device pattern detection | `device_fingerprint_sdk` + Snowflake enrichment | **Enhancement**: SDK captures signals at edge (signup/login/checkout); Device Agent analyzes enriched device data in Snowflake |

**Integration Approach**: Device fingerprint SDK becomes the **primary** device signal capture mechanism at the edge, while Device Agent continues to analyze device patterns using enriched SDK data.

#### External API Integrations

| Existing Tool (MCP Server) | Current Status | New Composio Tool | Integration Strategy |
|---------------------------|----------------|-------------------|----------------------|
| `check_ip_reputation` (external_api_server) | **Stubbed** - TODO comments for IPQualityScore, AbuseIPDB, MaxMind | `maxmind_minfraud` (via Composio) | **Implementation**: Replace stubbed implementation with Composio-integrated MaxMind minFraud |
| `verify_email_address` (external_api_server) | **Stubbed** - Basic validation only | `composio_email_verification` (via Composio toolkits) | **Enhancement**: Use Composio email verification toolkits (SendGrid, Mailgun, ZeroBounce) |
| `validate_phone_number` (external_api_server) | **Stubbed** - Basic validation only | `composio_phone_validation` (via Composio toolkits) | **Enhancement**: Use Composio phone validation toolkits (Twilio, Nexmo) |
| `check_credit_bureau` (external_api_server) | **Stubbed** - Compliance notice only | `composio_credit_check` (via Composio toolkits) | **Future**: Integrate credit bureau toolkits when compliance requirements are met |

**Integration Approach**: Replace stubbed MCP server tools with Composio-integrated implementations, maintaining backward compatibility with existing tool interfaces.

#### Automated Response Actions

| Existing Capability | Current Implementation | New Composio Tool | Integration Strategy |
|---------------------|------------------------|-------------------|----------------------|
| Manual investigation actions | User-initiated via UI/API | `composio_stripe_actions`, `composio_shopify_actions`, `composio_okta_actions`, `composio_slack_actions`, `composio_jira_actions` | **New Capability**: Enable automated actions via SOAR playbooks. Composio provides unified interface for tenant-scoped actions across multiple SaaS platforms |
| Splunk SOAR playbooks | Detection and evidence collection | `composio_action_executor` (orchestrates all Composio toolkits) | **Enhancement**: SOAR playbooks orchestrate evidence collection; Composio executes enforcement actions |

**Integration Approach**: Composio becomes the **action execution layer** for SOAR playbooks, enabling tenant-scoped automated responses without per-tool OAuth implementations.

### Agent-to-Tools Mapping (Existing + New)

#### Network Agent

**Existing Tools** (12 tools):
- `simple_ip_reputation` (AbuseIPDB)
- `bulk_ip_analysis` (AbuseIPDB)
- `cidr_block_analysis` (AbuseIPDB)
- `virustotal_ip_analysis`
- `virustotal_domain_analysis`
- `virustotal_url_analysis`
- `shodan_infrastructure_analysis`
- `shodan_search`
- `unified_threat_intelligence`
- `snowflake_query_tool`
- `splunk_query`
- `sumologic_query`

**New Tools** (via Composio integration):
- `maxmind_minfraud` - **Primary** transaction risk scorer (called before authorization)
- `composio_stripe_actions` - Execute Stripe actions (void, refund, review) for high-risk IPs
- `composio_okta_actions` - Force MFA/step-up for accounts associated with risky IPs

**Usage Pattern**: Network Agent uses MaxMind minFraud for **real-time transaction risk scoring**, while existing threat intel tools (AbuseIPDB, VirusTotal, Shodan) remain for **investigation enrichment**. Composio actions enable automated response when high-risk IPs are detected.

#### Device Agent

**Existing Tools** (8 tools):
- `snowflake_query_tool`
- `splunk_query`
- `sumologic_query`
- `database_query`
- `simple_ip_reputation` (for device IPs)
- `virustotal_ip_analysis` (for device IPs)
- `shodan_infrastructure_analysis` (for device IPs)
- `http_request`, `json_api`, `web_search`

**New Tools** (via Composio integration):
- `device_fingerprint_sdk` (Fingerprint Pro/SEON/IPQS) - **Primary** device signal capture at edge
- `composio_shopify_actions` - Cancel/tag orders from suspicious devices
- `composio_okta_actions` - Suspend accounts or force MFA for compromised devices

**Usage Pattern**: Device Agent analyzes device patterns using SDK-enriched data in Snowflake. SDK captures signals at signup/login/checkout; Device Agent queries Snowflake for device-based features (shared_device_count, device_age, device_risk_score). Composio actions enable automated device-based responses.

#### Location Agent

**Existing Tools** (7 tools):
- `snowflake_query_tool`
- `splunk_query`
- `sumologic_query`
- `database_query`
- `http_request`, `json_api`, `web_search`
- `vector_search`

**New Tools** (via Composio integration):
- `maxmind_minfraud` - Geolocation data and geolocation mismatch detection
- `composio_stripe_actions` - Review/void transactions with geolocation anomalies

**Usage Pattern**: Location Agent uses MaxMind geolocation data for impossible travel detection and geolocation mismatch analysis. Composio actions enable automated response for geolocation anomalies.

#### Logs Agent

**Existing Tools** (9 tools):
- `splunk_query`
- `sumologic_query`
- `snowflake_query_tool`
- `database_query`
- `vector_search`
- `web_search`
- `http_request`, `json_api`
- `file_read`, `file_search`

**New Tools** (via Composio integration):
- `composio_slack_actions` - Send alerts to #fraud-ops channel when log anomalies detected
- `composio_jira_actions` - Create investigation cases from log-based anomalies

**Usage Pattern**: Logs Agent analyzes SIEM logs for fraud patterns. Composio actions enable automated notification and case creation when log-based anomalies are detected.

#### Behavior Agent

**Existing Tools** (9 tools):
- `snowflake_query_tool`
- `splunk_query`
- `sumologic_query`
- `database_query`
- `behavioral_analysis` (ML/AI)
- `anomaly_detection` (ML/AI)
- `pattern_recognition` (ML/AI)
- `fraud_detection` (ML/AI)
- `vector_search`

**New Tools** (via Composio integration):
- `device_fingerprint_sdk` - Behavioral signals (mouse movements, typing patterns, scroll behavior)
- `composio_okta_actions` - Step-up authentication for behavioral anomalies
- `composio_stripe_actions` - Review transactions with behavioral risk signals

**Usage Pattern**: Behavior Agent analyzes behavioral patterns using SDK behavioral signals and ML models. Composio actions enable automated response for behavioral anomalies.

#### Risk Agent

**Existing Tools** (12 tools):
- `snowflake_query_tool`
- `database_query`
- `simple_ip_reputation`
- `unified_threat_intelligence`
- `virustotal_ip_analysis`
- `virustotal_domain_analysis`
- `shodan_infrastructure_analysis`
- `risk_scoring` (ML/AI)
- `fraud_detection` (ML/AI)
- `anomaly_detection` (ML/AI)
- `splunk_query`
- `sumologic_query`

**New Tools** (via Composio integration):
- `maxmind_minfraud` - Transaction risk score input for risk aggregation
- `device_fingerprint_sdk` - Device risk signals for risk aggregation
- `graph_features` (Neo4j/TigerGraph) - Cluster risk scores for risk aggregation
- `composio_action_executor` - Execute automated responses based on aggregated risk score

**Usage Pattern**: Risk Agent aggregates risk from multiple sources (threat intel, device signals, IP risk, graph features) and computes final risk score. Composio actions enable automated response based on aggregated risk thresholds.

### Tool Integration Summary

**Enhancement Strategy**:
1. **Complementary**: New Composio tools enhance existing tools without replacing them
   - MaxMind minFraud complements AbuseIPDB/VirusTotal/Shodan (transaction risk vs. threat intel)
   - Device SDK enhances existing device analysis (edge capture vs. query-based analysis)

2. **Replacement**: New Composio tools replace stubbed implementations
   - MaxMind minFraud replaces stubbed `check_ip_reputation` in MCP server
   - Composio email/phone validation replaces stubbed MCP server tools

3. **New Capability**: Composio enables new automated response capabilities
   - SOAR playbooks + Composio actions enable automated fraud containment
   - Tenant-scoped OAuth enables multi-tenant fraud platform

**Backward Compatibility**: All existing tools remain available. New Composio tools are **additive**, not replacements. Agents can use both existing and new tools simultaneously.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tenant can complete Composio OAuth connection flow (connect Stripe account) in under 2 minutes, with connection status visible immediately after authorization
- **SC-002**: Device fingerprint SDK captures device signals for 95%+ of checkout transactions, with device_id persistence to Snowflake within 5 seconds of capture
- **SC-003**: IP risk scoring completes before authorization for 99%+ of transactions, with risk scores available in feature set within 10 seconds of transaction receipt
- **SC-004**: SOAR playbooks execute automated fraud response actions (Stripe void, Okta MFA, Slack notify) within 60 seconds of critical anomaly detection (severity=critical, score>4.5)
- **SC-005**: Snowpipe Streaming ingests events to Snowflake staging tables within 10 seconds of event publication to Kafka, with 99.9% ingestion success rate
- **SC-006**: Dynamic Tables refresh feature sets within 1 minute of source data freshness target, with features available for detection queries within 30 seconds of event ingestion
- **SC-007**: Graph features (shared_device_count, cluster_risk_score) are computed and exported to Snowflake within 5 minutes of entity data update, with 90%+ feature availability for ML model scoring
- **SC-008**: Composio action execution success rate is 95%+ for active connections, with failed actions retried automatically and escalated to manual review if retries exhausted
- **SC-009**: System reduces time-to-action for fraud response from manual (hours) to automated (under 60 seconds) for 80%+ of critical anomalies
- **SC-010**: Tenant self-service connection management reduces support tickets related to integration setup by 70% compared to manual OAuth implementation per tool
