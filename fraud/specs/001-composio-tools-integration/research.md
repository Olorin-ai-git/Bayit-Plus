# Research: Composio Tools Integration

**Feature**: 001-composio-tools-integration  
**Date**: 2025-01-31  
**Status**: Complete

## Overview

This research document covers the technical investigation for integrating Composio tools into the Olorin fraud detection platform. The integration enables unified OAuth management, device fingerprinting, IP risk scoring, automated SOAR responses, and real-time feature pipelines.

## 1. Composio SDK and OAuth Flow

### Composio Overview

**Composio** is a unified API platform that provides:
- 250+ pre-built toolkits (Stripe, Shopify, Okta, Slack, Jira, etc.)
- Unified OAuth management with tenant-scoped connections
- Action execution API with consistent interface across toolkits
- Python SDK (`composio-core`) and REST API

### OAuth Flow Pattern

**Tenant-Scoped Connections**:
1. Tenant initiates OAuth flow via `/api/composio/connect/{toolkit}`
2. System redirects to Composio OAuth URL with `tenant_id` in state
3. Tenant authorizes on external platform (Stripe, Shopify, etc.)
4. Composio redirects back with authorization code
5. System exchanges code for access token via Composio API
6. Connection stored in PostgreSQL with `tenant_id` isolation

**Connection Storage**:
- PostgreSQL table: `composio_connections`
- Fields: `tenant_id`, `toolkit_name`, `connection_id`, `status`, `expires_at`
- Encryption: Access tokens encrypted at rest using application key

### Action Execution

**Unified Interface**:
```python
composio_client.execute_action(
    toolkit="stripe",
    action="void_payment",
    connection_id=tenant_connection_id,
    parameters={"payment_id": "pi_123"}
)
```

**Tenant Scoping**:
- All actions require `tenant_id` + `connection_id`
- Composio SDK validates connection belongs to tenant
- Actions logged with tenant context for audit

### Python SDK Integration

**Package**: `composio-core` (pip install composio-core)

**Key Classes**:
- `ComposioClient`: Main client for OAuth and actions
- `Action`: Action definition and execution
- `Connection`: Connection management

**Integration Pattern**:
```python
from composio import ComposioClient

client = ComposioClient(api_key=COMPOSIO_API_KEY)
connection = client.get_connection(connection_id, tenant_id=tenant_id)
result = client.execute_action(
    toolkit="stripe",
    action="void_payment",
    connection_id=connection.id,
    parameters={"payment_id": payment_id}
)
```

## 2. Device Fingerprint SDKs

### Options Comparison

**Fingerprint Pro**:
- **Pros**: High accuracy (99.5%), persistent device IDs, behavioral signals, browser fingerprinting
- **Cons**: Higher cost, requires JavaScript SDK
- **Integration**: JavaScript SDK → Backend API → Snowflake

**SEON**:
- **Pros**: Fraud-focused, device intelligence, behavioral analysis, competitive pricing
- **Cons**: Smaller market share than Fingerprint Pro
- **Integration**: JavaScript SDK → Backend API → Snowflake

**IPQualityScore (IPQS)**:
- **Pros**: Device fingerprinting + IP reputation in one, cost-effective
- **Cons**: Less specialized in device fingerprinting
- **Integration**: JavaScript SDK → Backend API → Snowflake

### Recommended: Fingerprint Pro

**Rationale**: Highest accuracy, best documentation, proven fraud detection use cases, strong behavioral signal capture.

### Integration Pattern

**Frontend (Browser)**:
```javascript
import FingerprintJS from '@fingerprintjs/fingerprintjs-pro';

const fpPromise = FingerprintJS.load({ apiKey: FP_API_KEY });
const fp = await fpPromise;
const result = await fp.get();
// result.visitorId = persistent device_id
// result.confidence = confidence score
// result.components = browser fingerprint components
```

**Backend API Endpoint**:
```python
@app.post("/api/device-signals")
async def capture_device_signal(
    device_data: DeviceSignalRequest,
    tenant_id: str = Depends(get_tenant_id)
):
    # Persist to Snowflake device_signals table
    # Mirror to Splunk for real-time alerting
```

**Snowflake Schema**:
```sql
CREATE TABLE device_signals (
    device_id VARCHAR(255) PRIMARY KEY,
    transaction_id VARCHAR(255),
    user_id VARCHAR(255),
    confidence_score FLOAT,
    browser_fingerprint JSON,
    behavioral_signals JSON,
    captured_at TIMESTAMP,
    sdk_provider VARCHAR(50)
);
```

## 3. MaxMind minFraud API

### Overview

**MaxMind minFraud** provides:
- Transaction risk scoring (0-100)
- Proxy/VPN/TOR detection
- Geolocation data (country, region, city)
- Velocity signals (transaction frequency)
- Device intelligence (optional)

### API Integration

**Endpoint**: `https://minfraud.maxmind.com/minfraud/v2.0/score`

**Request Format**:
```json
{
  "device": {
    "ip_address": "192.0.2.1"
  },
  "email": {
    "address": "user@example.com"
  },
  "billing": {
    "country": "US"
  }
}
```

**Response Format**:
```json
{
  "risk_score": 75.5,
  "funds_remittance": {
    "risk_score": 80.0
  },
  "ip_address": {
    "risk": {
      "score": 75.5
    },
    "traits": {
      "is_proxy": true,
      "is_vpn": false,
      "is_tor": false
    },
    "location": {
      "country": {"code": "US"},
      "region": {"name": "California"},
      "city": {"name": "San Francisco"}
    }
  }
}
```

### Rate Limiting and Caching

**Rate Limits**: Varies by plan (typically 10k-100k requests/day)

**Caching Strategy**:
- Cache IP risk scores for 1 hour (IPs don't change frequently)
- Cache in Redis with key: `maxmind:ip:{ip_address}`
- Fallback to AbuseIPDB if MaxMind unavailable

### Integration Pattern

```python
from maxminddb import open_database
import requests

class MaxMindClient:
    def score_transaction(self, ip_address: str, transaction_data: dict):
        # Check cache first
        cached_score = redis.get(f"maxmind:ip:{ip_address}")
        if cached_score:
            return json.loads(cached_score)
        
        # Call MaxMind API
        response = requests.post(
            "https://minfraud.maxmind.com/minfraud/v2.0/score",
            json={"device": {"ip_address": ip_address}, **transaction_data},
            headers={"Authorization": f"Basic {MAXMIND_LICENSE_KEY}"}
        )
        
        score_data = response.json()
        
        # Cache result
        redis.setex(
            f"maxmind:ip:{ip_address}",
            3600,  # 1 hour TTL
            json.dumps(score_data)
        )
        
        return score_data
```

## 4. Splunk SOAR Playbook Integration

### SOAR Overview

**Splunk SOAR** (Security Orchestration, Automation, and Response) provides:
- Playbook orchestration for automated responses
- Evidence collection and containment workflows
- Integration with external systems via REST API

### Playbook Execution Pattern

**SOAR REST API**:
- Endpoint: `https://{soar_host}/rest/playbook_execution`
- Authentication: API token or OAuth
- Trigger: POST request with playbook ID and context

**Playbook Structure**:
1. **Trigger**: Anomaly detected (severity=critical, score>4.5)
2. **Evidence Collection**: Query Snowflake, Splunk, threat intel
3. **Risk Assessment**: Aggregate scores from multiple sources
4. **Action Execution**: Call Composio actions (Stripe void, Okta MFA, etc.)
5. **Logging**: Write outcomes to Splunk and Snowflake audit tables

### Integration Pattern

```python
class SOARPlaybookExecutor:
    def execute_playbook(
        self,
        playbook_id: str,
        investigation_id: str,
        anomaly_id: str,
        tenant_id: str
    ):
        # Trigger SOAR playbook
        soar_response = requests.post(
            f"{SOAR_HOST}/rest/playbook_execution",
            json={
                "playbook_id": playbook_id,
                "context": {
                    "investigation_id": investigation_id,
                    "anomaly_id": anomaly_id,
                    "tenant_id": tenant_id
                }
            },
            headers={"Authorization": f"Bearer {SOAR_API_TOKEN}"}
        )
        
        # SOAR playbook calls Composio actions via webhook
        # Webhook endpoint: /api/composio/soar-action
```

**Composio Action Webhook**:
```python
@app.post("/api/composio/soar-action")
async def execute_soar_action(action_request: SOARActionRequest):
    # Validate SOAR signature
    # Execute Composio action with tenant scoping
    # Return result to SOAR
```

## 5. Snowpipe Streaming and Dynamic Tables

### Snowpipe Streaming

**Overview**: High-performance event ingestion to Snowflake with sub-second latency.

**Architecture**:
- Kafka topics → Snowpipe Streaming → Snowflake staging tables
- No intermediate storage, direct ingestion
- Automatic schema evolution

**Setup**:
```sql
CREATE STREAMING PIPE events_pipe
AS COPY INTO events_staging
FROM (
    SELECT 
        $1:event_id::VARCHAR as event_id,
        $1:event_type::VARCHAR as event_type,
        $1:timestamp::TIMESTAMP as timestamp,
        $1:data::VARIANT as data
    FROM @events_stage
)
FILE_FORMAT = (TYPE = 'JSON');
```

**Integration Pattern**:
```python
from snowflake.connector import connect

# Publish to Kafka topic
kafka_producer.send("events", {
    "event_id": event_id,
    "event_type": "transaction",
    "timestamp": datetime.now().isoformat(),
    "data": transaction_data
})

# Snowpipe Streaming automatically ingests to Snowflake
# Appears in events_staging table within 10 seconds
```

### Dynamic Tables

**Overview**: Declarative feature pipelines with automatic refresh based on freshness targets.

**Setup**:
```sql
CREATE DYNAMIC TABLE features_curated
TARGET_LAG = '1 minute'
WAREHOUSE = 'COMPUTE_WH'
AS
SELECT
    e.event_id,
    e.timestamp,
    ds.device_id,
    ds.confidence_score,
    ip.risk_score,
    ip.is_proxy,
    ip.is_vpn
FROM events_staging e
LEFT JOIN device_signals ds ON e.event_id = ds.transaction_id
LEFT JOIN ip_risk_scores ip ON e.event_id = ip.transaction_id;
```

**Refresh Behavior**:
- Automatically refreshes when source data changes
- Respects freshness target (1 minute)
- Incremental updates (only processes new/changed rows)

## 6. Neo4j Graph Database Integration

### Overview

**Neo4j** provides:
- Graph database for entity relationship analysis
- Graph algorithms (community detection, centrality, clustering)
- Cypher query language
- Snowflake integration via Neo4j Connector for Apache Spark

### Entity Graph Model

**Nodes**:
- `User` (user_id, risk_score)
- `Device` (device_id, device_type)
- `Card` (card_id, last_4_digits)
- `IP` (ip_address, country)
- `Phone` (phone_number, carrier)
- `Email` (email_address, domain)

**Relationships**:
- `User` -[:USES]-> `Device`
- `User` -[:HAS]-> `Card`
- `User` -[:CONNECTED_FROM]-> `IP`
- `Device` -[:SHARED_WITH]-> `User` (multi-accounting detection)

### Graph Feature Computation

**Cypher Query Example**:
```cypher
MATCH (u1:User)-[:USES]->(d:Device)<-[:USES]-(u2:User)
WHERE u1 <> u2
WITH d, collect(DISTINCT u1) + collect(DISTINCT u2) as users
WHERE size(users) >= 2
RETURN d.device_id as device_id,
       size(users) as shared_user_count,
       avg([u IN users | u.risk_score]) as cluster_risk_score
```

### Integration Pattern

```python
from neo4j import GraphDatabase

class Neo4jGraphClient:
    def compute_cluster_features(self, entity_id: str, entity_type: str):
        query = """
        MATCH (e:{entity_type} {{id: $entity_id}})
        -[:RELATED_TO*1..2]-(related)
        WITH e, collect(DISTINCT related) as cluster
        RETURN e.id as entity_id,
               size(cluster) as cluster_size,
               avg([n IN cluster | n.risk_score]) as cluster_risk_score
        """.format(entity_type=entity_type)
        
        result = self.driver.session().run(query, entity_id=entity_id)
        return result.single()
```

**Export to Snowflake**:
```python
# Compute graph features
graph_features = neo4j_client.compute_cluster_features(entity_id, "User")

# Write to Snowflake
snowflake_client.execute(
    """
    INSERT INTO graph_features (entity_id, cluster_size, cluster_risk_score)
    VALUES (%s, %s, %s)
    """,
    (graph_features['entity_id'], graph_features['cluster_size'], graph_features['cluster_risk_score'])
)
```

## 7. Integration with Existing Agents

### Network Agent Integration

**Existing Tools**: AbuseIPDB, VirusTotal, Shodan (12 tools)
**New Tools**: MaxMind minFraud, Composio Stripe/Okta actions

**Usage Pattern**:
- MaxMind minFraud: **Primary** transaction risk scorer (before authorization)
- AbuseIPDB/VirusTotal/Shodan: **Investigation enrichment** (after detection)

### Device Agent Integration

**Existing Tools**: Snowflake queries, threat intel for device IPs (8 tools)
**New Tools**: Device fingerprint SDK, Composio Shopify/Okta actions

**Usage Pattern**:
- Device SDK: **Edge capture** at signup/login/checkout
- Device Agent: **Analysis** of SDK-enriched data in Snowflake
- Composio actions: **Automated response** for suspicious devices

### Risk Agent Integration

**Existing Tools**: Threat intel, ML models (12 tools)
**New Tools**: MaxMind scores, device SDK signals, graph features, Composio actions

**Usage Pattern**:
- Risk Agent **aggregates** risk from all sources
- Composio actions **execute** based on aggregated risk thresholds

## 8. Security and Compliance Considerations

### Tenant Data Isolation

**Requirement**: All Composio actions must be tenant-scoped.

**Implementation**:
- Connection storage: `tenant_id` + `connection_id` isolation
- Action execution: Validate `tenant_id` matches connection owner
- Audit logging: All actions logged with tenant context

### OAuth Token Security

**Storage**: Encrypted at rest using application encryption key
**Rotation**: Tokens refreshed automatically via Composio refresh token flow
**Expiration**: Connections invalidated on 401/403 errors, tenant prompted to reconnect

### API Rate Limiting

**MaxMind**: Cache scores, respect rate limits, fallback to AbuseIPDB
**Composio**: Respect rate limits, implement request queuing
**Device SDK**: Browser-side, no backend rate limits

## 9. Performance Considerations

### Latency Targets

- Composio OAuth: <2 seconds
- Device SDK capture: <100ms browser-side, <5s Snowflake persistence
- MaxMind scoring: <200ms per transaction (with caching)
- SOAR playbook: <60 seconds end-to-end
- Snowpipe Streaming: <10 seconds ingestion latency

### Scalability

- Multi-tenant: 10-1000+ tenants
- Transaction volume: 1M+ transactions/day
- Event ingestion: 10k+ events/second via Snowpipe Streaming
- Graph queries: Sub-100ms for entity relationship queries

## 10. Migration Strategy

### Backward Compatibility

**Existing Tools**: All remain available (AbuseIPDB, VirusTotal, Shodan)
**New Tools**: Additive, not replacements
**Agents**: Can use both existing and new tools simultaneously

### Rollout Plan

1. **Phase 1**: Composio OAuth + basic actions (Stripe, Shopify)
2. **Phase 2**: Device fingerprint SDK integration
3. **Phase 3**: MaxMind minFraud integration
4. **Phase 4**: SOAR playbook automation
5. **Phase 5**: Snowpipe Streaming + Dynamic Tables
6. **Phase 6**: Neo4j graph integration

## References

- Composio Documentation: https://docs.composio.dev
- Fingerprint Pro Documentation: https://dev.fingerprint.com
- MaxMind minFraud API: https://dev.maxmind.com/minfraud/
- Splunk SOAR Documentation: https://docs.splunk.com/Documentation/SOAR
- Snowpipe Streaming: https://docs.snowflake.com/en/user-guide/data-load-snowpipe-streaming
- Dynamic Tables: https://docs.snowflake.com/en/user-guide/dynamic-tables
- Neo4j Python Driver: https://neo4j.com/docs/python-manual/current/

