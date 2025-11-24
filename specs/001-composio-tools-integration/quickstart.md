# Quickstart: Composio Tools Integration

**Feature**: 001-composio-tools-integration  
**Date**: 2025-01-31  
**Status**: Complete

## Overview

This quickstart guide provides step-by-step instructions for integrating Composio tools into the Olorin fraud detection platform.

## Prerequisites

- Python 3.11+ with Poetry
- Node.js 18+ with npm
- PostgreSQL database (existing)
- Snowflake account (existing)
- Composio account and API key
- MaxMind minFraud license key
- Device fingerprint SDK account (Fingerprint Pro, SEON, or IPQS)
- Splunk SOAR instance (optional, for automated playbooks)

## Installation

### 1. Backend Dependencies

```bash
cd olorin-server
poetry add composio-core
poetry add maxminddb
poetry add neo4j  # Optional, for graph features
```

### 2. Frontend Dependencies

```bash
cd olorin-front
npm install @fingerprintjs/fingerprintjs-pro  # Or SEON/IPQS SDK
```

### 3. Environment Variables

Add to `olorin-server/.env`:

```bash
# Composio
COMPOSIO_API_KEY=your_composio_api_key

# MaxMind minFraud
MAXMIND_LICENSE_KEY=your_maxmind_license_key
MAXMIND_ACCOUNT_ID=your_maxmind_account_id

# Device Fingerprint SDK
FINGERPRINT_PRO_API_KEY=your_fingerprint_pro_api_key  # Or SEON/IPQS keys

# Neo4j (optional)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# Splunk SOAR (optional)
SOAR_HOST=https://your-soar-instance.com
SOAR_API_TOKEN=your_soar_api_token
```

## Database Setup

### 1. PostgreSQL Migration

Run migration script:

```bash
cd olorin-server
poetry run python -m alembic upgrade head
# Or manually run SQL from data-model.md
```

### 2. Snowflake Tables

Execute SQL from `data-model.md`:

```sql
CREATE TABLE device_signals (...);
CREATE TABLE ip_risk_scores (...);
CREATE TABLE graph_features (...);
CREATE TABLE snowpipe_streaming_ingestion (...);
CREATE TABLE dynamic_table_pipelines (...);
```

## Integration Steps

### Step 1: Composio OAuth Setup

1. **Initialize Composio Client**:

```python
# olorin-server/app/service/composio/client.py
from composio import ComposioClient

composio_client = ComposioClient(api_key=os.getenv("COMPOSIO_API_KEY"))
```

2. **Create OAuth Endpoint**:

```python
# olorin-server/app/api/routes/composio.py
@app.post("/api/composio/connect/{toolkit}")
async def connect_toolkit(toolkit: str, tenant_id: str):
    oauth_url = composio_client.get_oauth_url(
        toolkit=toolkit,
        redirect_uri=f"{BASE_URL}/api/composio/callback",
        state=f"{tenant_id}:{toolkit}"
    )
    return {"oauth_url": oauth_url, "state": state}
```

3. **Handle OAuth Callback**:

```python
@app.get("/api/composio/callback")
async def oauth_callback(code: str, state: str):
    tenant_id, toolkit = state.split(":")
    connection = composio_client.create_connection(
        toolkit=toolkit,
        authorization_code=code
    )
    # Store connection in PostgreSQL
    db.save_composio_connection(tenant_id, toolkit, connection.id)
    return {"connection_id": connection.id, "status": "active"}
```

### Step 2: Device Fingerprint SDK Integration

1. **Frontend SDK Integration**:

```typescript
// olorin-front/src/services/deviceFingerprintService.ts
import FingerprintJS from '@fingerprintjs/fingerprintjs-pro';

export async function captureDeviceSignal(transactionId: string) {
  const fpPromise = FingerprintJS.load({ apiKey: process.env.REACT_APP_FP_API_KEY });
  const fp = await fpPromise;
  const result = await fp.get();
  
  await fetch('/api/device-signals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_id: result.visitorId,
      transaction_id: transactionId,
      confidence_score: result.confidence.score,
      browser_fingerprint: result.components,
      sdk_provider: 'fingerprint_pro'
    })
  });
}
```

2. **Backend API Endpoint**:

```python
# olorin-server/app/api/routes/device_signals.py
@app.post("/api/device-signals")
async def capture_device_signal(signal: DeviceSignalRequest):
    # Persist to Snowflake
    snowflake_client.execute(
        "INSERT INTO device_signals VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (signal.device_id, signal.transaction_id, signal.user_id,
         signal.confidence_score, json.dumps(signal.browser_fingerprint),
         json.dumps(signal.behavioral_signals), datetime.now(), signal.sdk_provider)
    )
    
    # Mirror to Splunk
    splunk_client.log_event({
        "event_type": "device_signal_captured",
        "device_id": signal.device_id,
        "transaction_id": signal.transaction_id
    })
    
    return {"status": "captured", "device_id": signal.device_id}
```

### Step 3: MaxMind minFraud Integration

1. **Create MaxMind Client**:

```python
# olorin-server/app/service/ip_risk/maxmind_client.py
import requests
import redis

class MaxMindClient:
    def __init__(self):
        self.api_key = os.getenv("MAXMIND_LICENSE_KEY")
        self.redis_client = redis.Redis()
    
    def score_transaction(self, transaction_data: dict):
        ip_address = transaction_data["ip_address"]
        
        # Check cache
        cached = self.redis_client.get(f"maxmind:ip:{ip_address}")
        if cached:
            return json.loads(cached)
        
        # Call MaxMind API
        response = requests.post(
            "https://minfraud.maxmind.com/minfraud/v2.0/score",
            json={"device": {"ip_address": ip_address}, **transaction_data},
            auth=(os.getenv("MAXMIND_ACCOUNT_ID"), self.api_key)
        )
        
        score_data = response.json()
        
        # Cache for 1 hour
        self.redis_client.setex(
            f"maxmind:ip:{ip_address}",
            3600,
            json.dumps(score_data)
        )
        
        # Persist to Snowflake
        snowflake_client.execute(
            "INSERT INTO ip_risk_scores VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (transaction_data["transaction_id"], ip_address,
             score_data["risk_score"], score_data["ip_address"]["traits"]["is_proxy"],
             score_data["ip_address"]["traits"]["is_vpn"], score_data["ip_address"]["traits"]["is_tor"],
             json.dumps(score_data["ip_address"]["location"]),
             json.dumps(score_data.get("velocity_signals", {})),
             datetime.now(), "maxmind")
        )
        
        return score_data
```

2. **API Endpoint**:

```python
# olorin-server/app/api/routes/ip_risk.py
@app.post("/api/ip-risk/score")
async def score_ip_risk(request: IPRiskScoreRequest):
    maxmind_client = MaxMindClient()
    score_data = maxmind_client.score_transaction(request.dict())
    return score_data
```

### Step 4: SOAR Playbook Integration

1. **Create SOAR Playbook Executor**:

```python
# olorin-server/app/service/soar/playbook_executor.py
import requests

class SOARPlaybookExecutor:
    def execute_playbook(self, playbook_id: str, context: dict):
        response = requests.post(
            f"{os.getenv('SOAR_HOST')}/rest/playbook_execution",
            json={
                "playbook_id": playbook_id,
                "context": context
            },
            headers={"Authorization": f"Bearer {os.getenv('SOAR_API_TOKEN')}"}
        )
        return response.json()
```

2. **Composio Action Webhook**:

```python
# olorin-server/app/api/routes/composio.py
@app.post("/api/composio/soar-action")
async def execute_soar_action(request: SOARActionRequest):
    # Validate SOAR signature
    if not validate_soar_signature(request.soar_signature, request.dict()):
        raise HTTPException(401, "Invalid signature")
    
    # Execute Composio action
    composio_client = ComposioClient()
    connection = get_tenant_connection(request.tenant_id, request.toolkit)
    result = composio_client.execute_action(
        toolkit=request.toolkit,
        action=request.action,
        connection_id=connection.connection_id,
        parameters=request.parameters
    )
    
    # Log to audit table
    db.log_composio_action(request.execution_id, request.toolkit, request.action, result)
    
    return result
```

### Step 5: Snowpipe Streaming Setup

1. **Create Snowpipe Streaming Pipe**:

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

2. **Publish Events to Kafka**:

```python
# olorin-server/app/service/events/kafka_producer.py
from kafka import KafkaProducer

producer = KafkaProducer(bootstrap_servers=['localhost:9092'])

def publish_event(event_type: str, event_data: dict):
    producer.send('events', {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "timestamp": datetime.now().isoformat(),
        "data": event_data
    })
```

### Step 6: Dynamic Tables Setup

1. **Create Dynamic Table**:

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

## Testing

### Unit Tests

```bash
cd olorin-server
poetry run pytest tests/unit/test_composio_client.py
poetry run pytest tests/unit/test_maxmind_client.py
poetry run pytest tests/unit/test_device_signal_processor.py
```

### Integration Tests

```bash
poetry run pytest tests/integration/test_composio_oauth_flow.py
poetry run pytest tests/integration/test_soar_playbook_execution.py
poetry run pytest tests/integration/test_device_sdk_integration.py
```

## Next Steps

1. **Configure SOAR Playbooks**: Create playbooks for automated fraud response
2. **Set Up Monitoring**: Monitor Composio action success rates, MaxMind API usage, device SDK capture rates
3. **Optimize Caching**: Tune Redis cache TTLs for MaxMind scores
4. **Graph Integration**: Set up Neo4j and configure graph feature computation (optional)
5. **Production Deployment**: Deploy to production with proper error handling and monitoring

## Troubleshooting

### Composio OAuth Issues

- **Issue**: OAuth callback fails
- **Solution**: Verify redirect_uri matches Composio app configuration

### Device SDK Issues

- **Issue**: Device signals not captured
- **Solution**: Check browser console for SDK errors, verify API key

### MaxMind Rate Limits

- **Issue**: 429 Too Many Requests
- **Solution**: Increase Redis cache TTL, implement request queuing

### SOAR Playbook Failures

- **Issue**: Playbook execution fails
- **Solution**: Verify SOAR API token, check playbook configuration

## References

- [Composio Documentation](https://docs.composio.dev)
- [Fingerprint Pro Documentation](https://dev.fingerprint.com)
- [MaxMind minFraud API](https://dev.maxmind.com/minfraud/)
- [Snowpipe Streaming Guide](https://docs.snowflake.com/en/user-guide/data-load-snowpipe-streaming)
- [Dynamic Tables Guide](https://docs.snowflake.com/en/user-guide/dynamic-tables)

