# API Contracts - Investigation Polling and Persistence

This directory contains OpenAPI/AsyncAPI specifications for all REST and WebSocket APIs related to investigation wizard state polling and persistence.

## Contract Files

### 1. wizard-state-api.yaml
**OpenAPI 3.0.3 specification for Wizard State REST API**

**Endpoints:**
- `POST /wizard-state` - Create new wizard state
- `GET /wizard-state/{investigationId}` - Retrieve current state
- `PUT /wizard-state/{investigationId}` - Update state (optimistic locking)
- `DELETE /wizard-state/{investigationId}` - Delete state
- `GET /wizard-state/{investigationId}/history` - Retrieve audit log

**Key Features:**
- Complete CRUD operations for wizard state
- Optimistic locking with version control (ETags)
- Conflict detection and resolution
- State validation with Pydantic schemas
- Comprehensive error responses
- Audit trail with change history

**Authentication:** Bearer JWT token

**Rate Limiting:** Configurable per environment

### 2. polling-api.yaml
**OpenAPI 3.0.3 specification for Adaptive Polling API**

**Endpoints:**
- `GET /polling/wizard-state/{investigationId}` - Poll wizard state
- `GET /polling/wizard-state/{investigationId}/changes` - Poll delta changes
- `GET /polling/active-investigations` - Poll all active investigations
- `GET /polling/health` - Health check (no auth)

**Polling Strategy:**
- **Fast (500ms):** status=IN_PROGRESS AND wizard_step=PROGRESS
- **Normal (2s):** status=IN_PROGRESS AND wizard_step=SETTINGS
- **Slow (5s):** status=COMPLETED OR wizard_step=RESULTS

**Optimization:**
- ETag-based conditional GET (304 Not Modified)
- Exponential backoff on errors (2x, max 30s)
- Server load-based interval adjustment
- Persistent HTTP connections (keep-alive)

**Authentication:** Bearer JWT token (except /health)

**Rate Limiting:**
- 100 requests per minute per user (configurable)
- 429 Too Many Requests with Retry-After header

### 3. template-api.yaml
**OpenAPI 3.0.3 specification for Template Management API**

**Endpoints:**
- `GET /templates` - List user templates
- `POST /templates` - Create template
- `GET /templates/{templateId}` - Retrieve template
- `PUT /templates/{templateId}` - Update template
- `DELETE /templates/{templateId}` - Delete template
- `POST /templates/{templateId}/apply` - Apply template to new investigation

**Key Features:**
- Save investigation configurations as reusable templates
- Template tagging and categorization
- Usage statistics tracking
- Placeholder replacement for entity values
- Configuration override support
- Soft delete for used templates

**Authentication:** Bearer JWT token

**Validation:** Template JSON validates against InvestigationSettings schema

### 4. websocket-events.yaml
**AsyncAPI 3.1.0 specification for WebSocket Real-Time Events**

**Connection:** `ws://[host]/ws/investigation/{investigationId}`

**Event Types:**

**Connection Events:**
- `connection_established` - Initial connection with current state
- `connection_closed` - Connection termination

**State Events:**
- `state_updated` - General state changes
- `step_changed` - Wizard step transition (SETTINGS → PROGRESS → RESULTS)

**Progress Events:**
- `progress_updated` - Investigation progress percentage
- `phase_changed` - Phase transition (PLANNING → EXECUTION → ANALYSIS → FINALIZATION)

**Tool Execution Events:**
- `tool_execution_started` - Tool begins execution
- `tool_execution_progress` - Tool progress updates
- `tool_execution_completed` - Tool finishes successfully
- `tool_execution_error` - Tool execution failure

**Results Events:**
- `results_available` - Investigation results ready

**Error Events:**
- `error_occurred` - Investigation or system errors

**Control Events:**
- `heartbeat` - Bidirectional keepalive (30s interval)
- `state_sync` - Full state synchronization on reconnection

**Authentication:**
- JWT token in query parameter: `?token={jwt_token}`
- OR Authorization header: `Authorization: Bearer {jwt_token}`

**Conflict Resolution:**
- WebSocket events are **authoritative** (override polling data)
- Server state takes precedence over client state
- Version-based conflict detection
- Full state sync on reconnection

## Configuration

All APIs are configuration-driven. No hardcoded values.

### Environment Variables

**Backend (Python/FastAPI):**
```bash
# Server Configuration
API_BASE_URL=https://api.olorin.com
WS_BASE_URL=wss://ws.olorin.com
BACKEND_PORT=8090

# Database
DATABASE_URL=sqlite:///olorin.db

# Authentication
JWT_SECRET_KEY=<secret-manager>
JWT_EXPIRY_HOURS=24

# Polling Configuration
POLLING_FAST_INTERVAL_MS=500
POLLING_NORMAL_INTERVAL_MS=2000
POLLING_SLOW_INTERVAL_MS=5000
POLLING_MAX_BACKOFF_MS=30000
POLLING_MAX_RETRIES=3

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST=20

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL_MS=30000
WS_CONNECTION_TIMEOUT_MS=10000
WS_MAX_CONNECTIONS_PER_USER=5

# Features
ENABLE_STATE_PERSISTENCE=true
ENABLE_TEMPLATE_MANAGEMENT=true
ENABLE_AUDIT_LOG=true
```

**Frontend (TypeScript/React):**
```bash
# API Configuration
REACT_APP_API_BASE_URL=https://api.olorin.com
REACT_APP_WS_BASE_URL=wss://ws.olorin.com

# Polling Configuration
REACT_APP_POLLING_FAST_INTERVAL_MS=500
REACT_APP_POLLING_NORMAL_INTERVAL_MS=2000
REACT_APP_POLLING_SLOW_INTERVAL_MS=5000
REACT_APP_POLLING_MAX_BACKOFF_MS=30000
REACT_APP_POLLING_MAX_RETRIES=3

# WebSocket Configuration
REACT_APP_WS_RECONNECT_INTERVAL_MS=1000
REACT_APP_WS_MAX_RECONNECT_INTERVAL_MS=30000
REACT_APP_WS_HEARTBEAT_INTERVAL_MS=30000
REACT_APP_WS_CONNECTION_TIMEOUT_MS=10000

# UI Configuration
REACT_APP_PAGINATION_SIZE=20
REACT_APP_REQUEST_TIMEOUT_MS=30000

# Features
REACT_APP_FEATURE_ENABLE_POLLING=true
REACT_APP_FEATURE_ENABLE_WEBSOCKET=true
REACT_APP_FEATURE_ENABLE_TEMPLATES=true
```

## Usage Examples

### REST API - Wizard State

**Create new wizard state:**
```bash
curl -X POST https://api.olorin.com/api/v1/wizard-state \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "investigation_id": "inv_2024_001",
    "wizard_step": "SETTINGS",
    "settings": {
      "name": "Account Takeover Investigation",
      "entities": [{"entity_type": "user_id", "entity_value": "user123"}],
      "time_range": {
        "start_time": "2024-01-01T00:00:00Z",
        "end_time": "2024-01-31T23:59:59Z"
      },
      "tools": [{"tool_name": "device_fingerprint", "enabled": true}],
      "correlation_mode": "OR"
    },
    "status": "IN_PROGRESS"
  }'
```

**Update wizard state with optimistic locking:**
```bash
curl -X PUT https://api.olorin.com/api/v1/wizard-state/inv_2024_001 \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "wizard_step": "PROGRESS",
    "progress": {
      "current_phase": "EXECUTION",
      "percent_complete": 50
    },
    "version": 5
  }'
```

### REST API - Polling

**Poll with conditional GET:**
```bash
curl -X GET https://api.olorin.com/api/v1/polling/wizard-state/inv_2024_001 \
  -H "Authorization: Bearer {jwt_token}" \
  -H "If-None-Match: \"version-12\"" \
  -H "X-Polling-Interval: 2000"
```

**Response (200 OK - state changed):**
```json
{
  "investigation_id": "inv_2024_001",
  "wizard_step": "PROGRESS",
  "status": "IN_PROGRESS",
  "last_updated": "2024-01-15T10:06:30Z",
  "version": 13,
  "progress": {
    "percent_complete": 55,
    "current_phase": "EXECUTION"
  },
  "recommended_interval_ms": 500
}
```

**Response (304 Not Modified - no change):**
```
Status: 304 Not Modified
ETag: "version-12"
X-Recommended-Interval: 2000
```

### REST API - Templates

**Create template:**
```bash
curl -X POST https://api.olorin.com/api/v1/templates \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Account Takeover Template",
    "description": "Standard investigation for account takeover",
    "template_json": {
      "entities": [{"entity_type": "user_id"}],
      "time_range": {"duration_hours": 24},
      "tools": [
        {"tool_name": "device_fingerprint", "enabled": true},
        {"tool_name": "location_analysis", "enabled": true}
      ],
      "correlation_mode": "OR"
    },
    "tags": ["account_security", "takeover"]
  }'
```

**Apply template to new investigation:**
```bash
curl -X POST https://api.olorin.com/api/v1/templates/tmpl_account_takeover/apply \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "investigation_id": "inv_2024_050",
    "investigation_name": "Account Takeover - User ABC123",
    "entity_values": [
      {"entity_type": "user_id", "entity_value": "ABC123"}
    ],
    "overrides": {
      "time_range": {
        "start_time": "2024-01-01T00:00:00Z",
        "end_time": "2024-01-15T23:59:59Z"
      }
    }
  }'
```

### WebSocket Events

**TypeScript Client Example:**
```typescript
import { io, Socket } from 'socket.io-client';

// Configuration from environment
const wsUrl = process.env.REACT_APP_WS_BASE_URL;
const jwtToken = localStorage.getItem('auth_token');
const investigationId = 'inv_2024_001';

// Connect to WebSocket
const socket: Socket = io(`${wsUrl}/ws/investigation/${investigationId}`, {
  auth: {
    token: jwtToken
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  timeout: 10000
});

// Connection established
socket.on('connection_established', (event) => {
  console.log('Connected:', event.connection_id);
  console.log('Current state:', event.current_state);
});

// State updated
socket.on('state_updated', (event) => {
  console.log('State updated:', event.updated_fields);
  console.log('New version:', event.version);
  // Update local state with changes
  updateLocalState(event.changes);
});

// Step changed
socket.on('step_changed', (event) => {
  console.log(`Step changed: ${event.from_step} → ${event.to_step}`);
  navigateToStep(event.to_step);
});

// Progress updated
socket.on('progress_updated', (event) => {
  console.log(`Progress: ${event.percent_complete}% (${event.current_phase})`);
  updateProgressBar(event.percent_complete);
});

// Tool execution started
socket.on('tool_execution_started', (event) => {
  console.log(`Tool started: ${event.tool_name}`);
  showToolExecutionIndicator(event.tool_name);
});

// Tool execution completed
socket.on('tool_execution_completed', (event) => {
  console.log(`Tool completed: ${event.tool_name} (${event.status})`);
  console.log(`Findings: ${event.findings_count}`);
  hideToolExecutionIndicator(event.tool_name);

  // Acknowledge critical event
  socket.emit('acknowledgment', {
    ack_type: 'acknowledgment',
    event_type: 'tool_execution_completed',
    version: event.version,
    timestamp: new Date().toISOString()
  });
});

// Results available
socket.on('results_available', (event) => {
  console.log(`Results ready: Risk score ${event.risk_score}`);
  console.log(`Report URL: ${event.report_url}`);
  navigateToResults();

  // Acknowledge critical event
  socket.emit('acknowledgment', {
    ack_type: 'acknowledgment',
    event_type: 'results_available',
    version: event.version,
    timestamp: new Date().toISOString()
  });
});

// Error occurred
socket.on('error_occurred', (event) => {
  console.error(`Error: ${event.error_message}`);
  showErrorNotification(event.error_message, event.recovery_action);
});

// Heartbeat
socket.on('heartbeat', (event) => {
  // Respond with heartbeat
  socket.emit('heartbeat', {
    event_type: 'heartbeat',
    timestamp: new Date().toISOString(),
    sender: 'client'
  });
});

// State sync (on reconnection)
socket.on('state_sync', (event) => {
  console.log('Full state sync:', event.sync_reason);
  replaceLocalState(event.full_state);
});

// Connection closed
socket.on('connection_closed', (event) => {
  console.log(`Connection closed: ${event.reason}`);
  // Fall back to polling
  startPolling();
});

// Error handling
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Fall back to polling
  startPolling();
});

// Disconnect
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Server initiated disconnect, try to reconnect
    socket.connect();
  }
  // Fall back to polling
  startPolling();
});
```

## Testing

### Swagger UI
REST APIs can be tested interactively using Swagger UI:
- Local: http://localhost:8090/docs
- Production: https://api.olorin.com/docs

### Postman Collection
Import OpenAPI specs into Postman for API testing:
1. Open Postman
2. Import → Link → Paste OpenAPI spec URL or file path
3. Configure environment variables
4. Test endpoints

### WebSocket Testing Tools
- **wscat:** Command-line WebSocket client
- **Postman:** WebSocket testing support
- **Browser DevTools:** Network tab → WS filter

**wscat example:**
```bash
npm install -g wscat
wscat -c "ws://localhost:8090/ws/investigation/inv_2024_001?token={jwt_token}"
```

## Validation

All API contracts follow OpenAPI 3.0.3 / AsyncAPI 3.1.0 specifications and can be validated using:

**OpenAPI Validator:**
```bash
npm install -g @apidevtools/swagger-cli
swagger-cli validate wizard-state-api.yaml
swagger-cli validate polling-api.yaml
swagger-cli validate template-api.yaml
```

**AsyncAPI Validator:**
```bash
npm install -g @asyncapi/cli
asyncapi validate websocket-events.yaml
```

## Code Generation

Generate client SDKs and server stubs from OpenAPI specs:

**TypeScript Client (Frontend):**
```bash
npm install -g openapi-typescript-codegen
openapi --input wizard-state-api.yaml --output ./src/api/wizard-state --client axios
openapi --input polling-api.yaml --output ./src/api/polling --client axios
openapi --input template-api.yaml --output ./src/api/templates --client axios
```

**Python Server (Backend):**
```bash
pip install fastapi-code-generator
fastapi-codegen --input wizard-state-api.yaml --output ./app/api/wizard_state.py
fastapi-codegen --input polling-api.yaml --output ./app/api/polling.py
fastapi-codegen --input template-api.yaml --output ./app/api/templates.py
```

**WebSocket Types (TypeScript):**
```bash
npm install -g @asyncapi/generator
ag websocket-events.yaml @asyncapi/typescript-template -o ./src/types/websocket
```

## Compliance

All API contracts are **SYSTEM MANDATE compliant**:

✅ **No hardcoded values** - All URLs, timeouts, limits from environment variables
✅ **Configuration-driven** - All settings externalized to config
✅ **No mocks/stubs** - Production-ready contracts with real validation
✅ **Schema validation** - Pydantic (backend) and Zod (frontend) validation
✅ **Fail-fast** - Validation errors return 422 with detailed messages
✅ **Complete** - No placeholders, ellipses, or TODOs

## Version Control

API contracts follow semantic versioning:
- **Major version** (v1, v2): Breaking changes to endpoints or schemas
- **Minor version** (v1.1, v1.2): New endpoints or optional fields
- **Patch version** (v1.0.1): Bug fixes, documentation updates

## Support

For questions or issues with API contracts:
1. Check this README for usage examples
2. Review OpenAPI/AsyncAPI specs for detailed documentation
3. Test in Swagger UI / Postman
4. Consult `/specs/005-polling-and-persistence/quickstart.md` for implementation guide

## Related Documentation

- **Feature Specification:** `/specs/005-polling-and-persistence/spec.md`
- **Implementation Plan:** `/specs/005-polling-and-persistence/plan.md`
- **Data Models:** `/specs/005-polling-and-persistence/data-model.md`
- **Research:** `/specs/005-polling-and-persistence/research.md`
- **Quickstart Guide:** `/specs/005-polling-and-persistence/quickstart.md` (next phase)
